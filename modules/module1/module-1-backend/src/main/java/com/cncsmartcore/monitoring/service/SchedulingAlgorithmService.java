package com.cncsmartcore.monitoring.service;

import com.cncsmartcore.monitoring.model.JobQueue;
import com.cncsmartcore.monitoring.model.ProductionJob;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Implements multiple scheduling algorithms for CNC job sequencing.
 * Each algorithm returns a re-ordered list of production jobs representing
 * the optimal sequence for a given machine.
 */
@Service
@Slf4j
public class SchedulingAlgorithmService {

    // ─── Public dispatch ──────────────────────────────────────────────────────

    public List<ProductionJob> schedule(List<ProductionJob> jobs,
                                         JobQueue.SchedulingAlgorithm algorithm) {
        if (jobs == null || jobs.isEmpty()) return Collections.emptyList();

        return switch (algorithm) {
            case FCFS     -> fcfs(jobs);
            case SPT      -> spt(jobs);
            case EDD      -> edd(jobs);
            case LPT      -> lpt(jobs);
            case PRIORITY -> priorityBased(jobs);
            case GENETIC  -> geneticAlgorithm(jobs);
        };
    }

    // ─── FCFS — First Come First Served ──────────────────────────────────────

    public List<ProductionJob> fcfs(List<ProductionJob> jobs) {
        return jobs.stream()
                .sorted(Comparator.comparing(ProductionJob::getCreatedAt,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .collect(Collectors.toList());
    }

    // ─── SPT — Shortest Processing Time ──────────────────────────────────────

    public List<ProductionJob> spt(List<ProductionJob> jobs) {
        return jobs.stream()
                .sorted(Comparator.comparingDouble(j ->
                        j.getEstimatedCycleTime() != null
                                ? j.getEstimatedCycleTime() * j.getQuantityRequired()
                                : Double.MAX_VALUE))
                .collect(Collectors.toList());
    }

    // ─── LPT — Longest Processing Time ───────────────────────────────────────

    public List<ProductionJob> lpt(List<ProductionJob> jobs) {
        return jobs.stream()
                .sorted(Comparator.comparingDouble((ProductionJob j) ->
                        j.getEstimatedCycleTime() != null
                                ? j.getEstimatedCycleTime() * j.getQuantityRequired()
                                : 0.0).reversed())
                .collect(Collectors.toList());
    }

    // ─── EDD — Earliest Due Date ──────────────────────────────────────────────

    public List<ProductionJob> edd(List<ProductionJob> jobs) {
        return jobs.stream()
                .sorted(Comparator.comparing(ProductionJob::getDueDate,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .collect(Collectors.toList());
    }

    // ─── Priority-based (priority ASC, then EDD) ──────────────────────────────

    public List<ProductionJob> priorityBased(List<ProductionJob> jobs) {
        return jobs.stream()
                .sorted(Comparator.comparingInt((ProductionJob j) ->
                                j.getPriority() != null ? j.getPriority() : Integer.MAX_VALUE)
                        .thenComparing(ProductionJob::getDueDate,
                                Comparator.nullsLast(Comparator.naturalOrder())))
                .collect(Collectors.toList());
    }

    // ─── Genetic Algorithm ────────────────────────────────────────────────────

    /**
     * A simplified Genetic Algorithm for job scheduling.
     * Objective: minimise total weighted tardiness.
     * Population: permutations of job sequences.
     */
    public List<ProductionJob> geneticAlgorithm(List<ProductionJob> jobs) {
        final int POP_SIZE      = 50;
        final int GENERATIONS   = 100;
        final double MUTATION_R = 0.15;

        int n = jobs.size();
        if (n <= 1) return new ArrayList<>(jobs);

        Random rng = new Random(42);

        // Initialise population
        List<int[]> population = new ArrayList<>();
        int[] baseline = new int[n];
        for (int i = 0; i < n; i++) baseline[i] = i;
        population.add(baseline.clone());

        for (int p = 1; p < POP_SIZE; p++) {
            int[] individual = baseline.clone();
            shuffle(individual, rng);
            population.add(individual);
        }

        int[] bestChromosome = population.get(0);
        double bestFitness = fitness(bestChromosome, jobs);

        for (int gen = 0; gen < GENERATIONS; gen++) {
            // Selection: tournament
            List<int[]> newPop = new ArrayList<>();
            for (int p = 0; p < POP_SIZE; p++) {
                int[] parent1 = tournament(population, jobs, rng);
                int[] parent2 = tournament(population, jobs, rng);
                int[] child = orderCrossover(parent1, parent2, rng, n);
                if (rng.nextDouble() < MUTATION_R) mutate(child, rng);
                newPop.add(child);

                double f = fitness(child, jobs);
                if (f < bestFitness) {
                    bestFitness = f;
                    bestChromosome = child.clone();
                }
            }
            population = newPop;
        }

        log.debug("Genetic scheduling complete. Best fitness (tardiness): {}", bestFitness);
        final int[] best = bestChromosome;
        return Arrays.stream(best).mapToObj(jobs::get).collect(Collectors.toList());
    }

    // ─── Makespan & Tardiness Calculation ────────────────────────────────────

    /**
     * Calculates estimated start/end times and tardiness for a scheduled sequence
     * starting at the given time.
     */
    public Map<Long, LocalDateTime[]> computeScheduleTimes(List<ProductionJob> sequence,
                                                             LocalDateTime startTime) {
        Map<Long, LocalDateTime[]> result = new LinkedHashMap<>();
        LocalDateTime current = startTime;

        for (ProductionJob job : sequence) {
            double setupMinutes = job.getEstimatedSetupTime() != null ? job.getEstimatedSetupTime() : 0;
            double runMinutes = job.getEstimatedCycleTime() != null
                    ? job.getEstimatedCycleTime() * job.getQuantityRequired() / 60.0 : 60;

            LocalDateTime jobStart = current;
            current = current.plusMinutes((long)(setupMinutes + runMinutes));
            result.put(job.getId(), new LocalDateTime[]{jobStart, current});
        }

        return result;
    }

    public double computeTotalMakespan(List<ProductionJob> sequence) {
        return sequence.stream()
                .mapToDouble(j -> {
                    double setup = j.getEstimatedSetupTime() != null ? j.getEstimatedSetupTime() : 0;
                    double run = j.getEstimatedCycleTime() != null
                            ? j.getEstimatedCycleTime() * j.getQuantityRequired() / 60.0 : 60;
                    return setup + run;
                }).sum();
    }

    // ─── GA helpers ───────────────────────────────────────────────────────────

    /**
     * Fitness = total weighted tardiness (lower is better).
     */
    private double fitness(int[] chromosome, List<ProductionJob> jobs) {
        double time = 0;
        double totalTardiness = 0;
        for (int idx : chromosome) {
            ProductionJob job = jobs.get(idx);
            double proc = job.getEstimatedCycleTime() != null
                    ? job.getEstimatedCycleTime() * job.getQuantityRequired() / 60.0 : 60;
            double setup = job.getEstimatedSetupTime() != null ? job.getEstimatedSetupTime() : 0;
            time += proc + setup;

            if (job.getDueDate() != null) {
                double dueMinutes = java.time.Duration
                        .between(LocalDateTime.now(), job.getDueDate()).toMinutes();
                double tardiness = Math.max(0, time - dueMinutes);
                int weight = job.getPriority() != null ? (11 - job.getPriority()) : 1;
                totalTardiness += tardiness * weight;
            }
        }
        return totalTardiness;
    }

    private int[] tournament(List<int[]> pop, List<ProductionJob> jobs, Random rng) {
        int i1 = rng.nextInt(pop.size());
        int i2 = rng.nextInt(pop.size());
        return fitness(pop.get(i1), jobs) <= fitness(pop.get(i2), jobs)
                ? pop.get(i1) : pop.get(i2);
    }

    /** Order Crossover (OX1) */
    private int[] orderCrossover(int[] p1, int[] p2, Random rng, int n) {
        int start = rng.nextInt(n);
        int end   = rng.nextInt(n);
        if (start > end) { int tmp = start; start = end; end = tmp; }

        int[] child = new int[n];
        Arrays.fill(child, -1);
        for (int i = start; i <= end; i++) child[i] = p1[i];

        Set<Integer> used = new HashSet<>();
        for (int i = start; i <= end; i++) used.add(child[i]);

        int pos = (end + 1) % n;
        for (int i = 0; i < n; i++) {
            int idx = (end + 1 + i) % n;
            if (!used.contains(p2[idx])) {
                child[pos] = p2[idx];
                pos = (pos + 1) % n;
            }
        }
        return child;
    }

    private void mutate(int[] chromosome, Random rng) {
        int i = rng.nextInt(chromosome.length);
        int j = rng.nextInt(chromosome.length);
        int tmp = chromosome[i]; chromosome[i] = chromosome[j]; chromosome[j] = tmp;
    }

    private void shuffle(int[] arr, Random rng) {
        for (int i = arr.length - 1; i > 0; i--) {
            int j = rng.nextInt(i + 1);
            int tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
        }
    }
}
