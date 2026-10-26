import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MaterialCatalogTable } from './components/MaterialCatalogTable';
import { RatingPill } from './components/RatingPill';
import { RecommendationForm } from './components/RecommendationForm';
import { RecommendationResultCard } from './components/RecommendationResultCard';
import { MaterialsPage } from './pages/MaterialsPage';
import { Material, MaterialRecommendationResponse } from './types';

const mockMaterials: Material[] = [
  {
    id: 'mat-1',
    code: 'AL6061-T6',
    name: 'Aluminium 6061-T6',
    category: 'ALUMINIUM',
    densityKgM3: 2700,
    kcNPerMm2: 700,
    vcMinMPerMin: 200,
    vcMaxMPerMin: 300,
    feedPerToothMm: 0.003,
    strengthRating: 3,
    lightnessRating: 4,
    corrosionRating: 4,
    machinabilityRating: 5,
    costLevel: 2,
    costPerKg: 350.0,
    suitableApplications: 'structural_bracket,housing',
    description: 'Aerospace structural alloy',
    isActive: true,
  },
  {
    id: 'mat-2',
    code: 'STEEL-1018',
    name: 'Mild Steel AISI 1018',
    category: 'STEEL',
    densityKgM3: 7850,
    kcNPerMm2: 1500,
    vcMinMPerMin: 90,
    vcMaxMPerMin: 140,
    feedPerToothMm: 0.002,
    strengthRating: 4,
    lightnessRating: 2,
    corrosionRating: 2,
    machinabilityRating: 3,
    costLevel: 1,
    costPerKg: 120.0,
    suitableApplications: 'shaft,weldment,bracket',
    description: 'Low-carbon structural steel',
    isActive: true,
  },
  {
    id: 'mat-3',
    code: 'SS-304',
    name: 'Stainless Steel 304',
    category: 'STAINLESS',
    densityKgM3: 8000,
    kcNPerMm2: 2100,
    vcMinMPerMin: 60,
    vcMaxMPerMin: 100,
    feedPerToothMm: 0.0015,
    strengthRating: 4,
    lightnessRating: 2,
    corrosionRating: 5,
    machinabilityRating: 2,
    costLevel: 4,
    costPerKg: 550.0,
    suitableApplications: 'marine,food,chemical',
    description: 'Austenitic stainless steel',
    isActive: true,
  },
];

const mockRecommendation: MaterialRecommendationResponse = {
  id: 'rec-1',
  cadVersionId: 'ver-1',
  algorithmVersion: 'rb-1.0',
  label: 'Rule-based recommendation',
  inputs: {
    priority: 'WEIGHT',
    environment: 'INDOOR',
    applicationType: 'STRUCTURAL',
    maxBudgetPerKg: 500,
  },
  results: [
    {
      rank: 1,
      materialId: 'mat-1',
      code: 'AL6061-T6',
      name: 'Aluminium 6061-T6',
      category: 'ALUMINIUM',
      score: 92.5,
      strengthRating: 3,
      lightnessRating: 4,
      corrosionRating: 4,
      machinabilityRating: 5,
      costLevel: 2,
      costPerKg: 350.0,
      reasons: ['Low material density (2700 kg/m³) provides optimal lightness (4/5)'],
      warnings: [],
    },
    {
      rank: 2,
      materialId: 'mat-2',
      code: 'STEEL-1018',
      name: 'Mild Steel AISI 1018',
      category: 'STEEL',
      score: 74.0,
      strengthRating: 4,
      lightnessRating: 2,
      corrosionRating: 2,
      machinabilityRating: 3,
      costLevel: 1,
      costPerKg: 120.0,
      reasons: ['Economical raw billet pricing (120.0 / kg) reduces bill of materials'],
      warnings: ['High density reduces strength-to-weight ratio'],
    },
    {
      rank: 3,
      materialId: 'mat-3',
      code: 'SS-304',
      name: 'Stainless Steel 304',
      category: 'STAINLESS',
      score: 65.0,
      strengthRating: 4,
      lightnessRating: 2,
      corrosionRating: 5,
      machinabilityRating: 2,
      costLevel: 4,
      costPerKg: 550.0,
      reasons: ['Superior passive oxidation layer ensures high corrosion resistance'],
      warnings: ['Base material cost (550.0/kg) exceeds specified target budget (500.0/kg)'],
    },
  ],
  createdAt: '2026-10-21T10:00:00Z',
};

describe('Materials Feature Components', () => {
  it('renders RatingPill with correct indicator value and label', () => {
    render(<RatingPill value={4} max={5} label="Strength" />);
    expect(screen.getByText('Strength')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('renders MaterialCatalogTable with alloy entries and handles search', () => {
    render(<MaterialCatalogTable materials={mockMaterials} />);
    expect(screen.getByText('AL6061-T6')).toBeInTheDocument();
    expect(screen.getByText('Mild Steel AISI 1018')).toBeInTheDocument();
    expect(screen.getByText('Stainless Steel 304')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/search alloy code/i);
    fireEvent.change(searchInput, { target: { value: 'Delrin' } });
    expect(screen.getByText(/no materials match/i)).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: '1018' } });
    expect(screen.getByText('STEEL-1018')).toBeInTheDocument();
  });

  it('renders RecommendationForm and invokes onSubmit with user selections', () => {
    const handleSubmit = vi.fn();
    render(<RecommendationForm onSubmit={handleSubmit} />);

    // Click Cost-Optimized button
    const costBtn = screen.getByText('Cost-Optimized');
    fireEvent.click(costBtn);

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /run material recommendation engine/i });
    fireEvent.click(submitBtn);

    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        priority: 'COST',
      })
    );
  });

  it('renders RecommendationResultCard with honesty label, scores, and ranked candidates', () => {
    const handleSelect = vi.fn();
    render(
      <RecommendationResultCard
        recommendation={mockRecommendation}
        onSelectMaterial={handleSelect}
      />
    );

    // Honesty label check
    expect(screen.getByText(/rule-based recommendation/i)).toBeInTheDocument();

    // Ranked candidates check (AC-14 requires >= 3 candidates)
    expect(screen.getByText('AL6061-T6')).toBeInTheDocument();
    expect(screen.getByText('STEEL-1018')).toBeInTheDocument();
    expect(screen.getByText('SS-304')).toBeInTheDocument();

    // Top score check
    expect(screen.getByText('92.5')).toBeInTheDocument();

    // Reasons check
    expect(
      screen.getByText(/Low material density \(2700 kg\/m³\) provides optimal lightness/i)
    ).toBeInTheDocument();

    // Select button check
    const selectButtons = screen.getAllByRole('button', { name: /select this material/i });
    expect(selectButtons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(selectButtons[0]);
    expect(handleSelect).toHaveBeenCalledWith('mat-1');
  });

  it('renders MaterialsPage with catalog and recommendation engine tabs', () => {
    render(
      <BrowserRouter>
        <MaterialsPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/Material Catalog & Recommendation Engine/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Recommendation Engine Sandbox/i })).toBeInTheDocument();
  });
});
