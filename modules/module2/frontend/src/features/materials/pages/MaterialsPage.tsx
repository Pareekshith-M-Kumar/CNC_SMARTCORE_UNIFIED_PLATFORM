import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/domain/PageHeader';
import { Panel } from '@/components/domain/Panel';
import { LabelChip } from '@/components/domain/LabelChip';
import { Material, MaterialRecommendationRequest, MaterialRecommendationResponse } from '../types';
import { materialsApi } from '../api';
import { MaterialCatalogTable } from '../components/MaterialCatalogTable';
import { RecommendationForm } from '../components/RecommendationForm';
import { RecommendationResultCard } from '../components/RecommendationResultCard';
import { Sparkles, BookOpen } from 'lucide-react';

export const MaterialsPage: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [recommendation, setRecommendation] = useState<MaterialRecommendationResponse | null>(null);
  const [isComputing, setIsComputing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'catalog' | 'simulator'>('catalog');

  useEffect(() => {
    const loadMaterials = async () => {
      setIsLoading(true);
      try {
        const data = await materialsApi.getMaterials();
        setMaterials(data);
      } catch (err) {
        console.error('Failed to load materials catalog', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadMaterials();
  }, []);

  const handleSimulateRecommendation = async (req: MaterialRecommendationRequest) => {
    setIsComputing(true);
    // Use an ephemeral simulation recommendation call with dummy UUID for sandbox testing
    const dummyVersionId = '00000000-0000-0000-0000-000000000000';
    try {
      // Local client-side calculation fallback or API call
      const res = await materialsApi.recommendMaterials(dummyVersionId, req).catch(() => {
        // Fallback local scoring if dummy version not found on backend
        return computeLocalRecommendation(materials, req);
      });
      setRecommendation(res);
    } catch {
      setRecommendation(computeLocalRecommendation(materials, req));
    } finally {
      setIsComputing(false);
    }
  };

  // Safe client-side fallback simulation to ensure smooth sandbox preview
  const computeLocalRecommendation = (
    mats: Material[],
    req: MaterialRecommendationRequest
  ): MaterialRecommendationResponse => {
    const results = mats.map((m, idx) => {
      let score = 70;
      if (req.priority === 'WEIGHT' && m.lightnessRating >= 4) score += 20;
      if (req.priority === 'STRENGTH' && m.strengthRating >= 4) score += 20;
      if (req.priority === 'COST' && m.costLevel <= 2) score += 22;
      if (req.priority === 'MACHINABILITY' && m.machinabilityRating >= 4) score += 20;
      if (req.priority === 'CORROSION' && m.corrosionRating >= 4) score += 20;
      if (req.environment === 'MARINE' && m.corrosionRating >= 4) score += 8;
      if (req.environment === 'MARINE' && m.corrosionRating <= 2) score -= 15;

      return {
        rank: idx + 1,
        materialId: m.id,
        code: m.code,
        name: m.name,
        category: m.category,
        score: Math.min(99, Math.max(10, score)),
        strengthRating: m.strengthRating,
        lightnessRating: m.lightnessRating,
        corrosionRating: m.corrosionRating,
        machinabilityRating: m.machinabilityRating,
        costLevel: m.costLevel,
        costPerKg: m.costPerKg,
        reasons: [`Matches ${req.priority.toLowerCase()} optimization weighting`],
        warnings: req.environment === 'MARINE' && m.corrosionRating <= 2 ? ['Marine environment corrosion risk'] : [],
      };
    }).sort((a, b) => b.score - a.score);

    results.forEach((r, i) => { r.rank = i + 1; });

    return {
      id: 'sim-' + Date.now(),
      cadVersionId: 'sandbox',
      algorithmVersion: 'rb-1.0',
      label: 'Rule-based recommendation',
      inputs: req,
      results,
      createdAt: new Date().toISOString(),
    };
  };

  return (
    <div className="space-y-6">
      <PageHeader
        category="Engineering Standards"
        title="Material Catalog & Recommendation Engine"
        description="Standardized engineering alloys with specific cutting forces (kc), recommended speeds (Vc), and rule-based multi-criteria scoring."
        actions={
          <div className="flex items-center gap-2">
            <LabelChip type="rule-based" />
            <LabelChip type="sample-data" />
          </div>
        }
      />

      {/* Mode Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-mono font-medium rounded-md transition-colors ${
            activeTab === 'catalog'
              ? 'bg-accent text-accent-fg font-semibold shadow-xs'
              : 'text-text-muted hover:text-text hover:bg-surface-2'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Material Catalog ({materials.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('simulator')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-mono font-medium rounded-md transition-colors ${
            activeTab === 'simulator'
              ? 'bg-accent text-accent-fg font-semibold shadow-xs'
              : 'text-text-muted hover:text-text hover:bg-surface-2'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Recommendation Engine Sandbox</span>
        </button>
      </div>

      {activeTab === 'catalog' ? (
        <Panel
          title="Standard Machining Materials Catalog"
          subtitle="Pre-calibrated cutting mechanics: specific cutting pressure (kc), cutting speeds (Vc), and physical densities"
          hasTicks
        >
          <MaterialCatalogTable
            materials={materials}
            isLoading={isLoading}
          />
        </Panel>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <Panel
              title="Recommendation Criteria"
              subtitle="Configure target constraints, environment, and optimization priority"
              headerActions={<LabelChip type="rule-based" />}
              hasTicks
            >
              <RecommendationForm
                onSubmit={handleSimulateRecommendation}
                isLoading={isComputing}
              />
            </Panel>
          </div>

          <div className="lg:col-span-7">
            <Panel
              title="Ranked Alloy Recommendations"
              subtitle="Rule-based multi-criteria ranking with transparent engineering justification"
              headerActions={<LabelChip type="rule-based" />}
              hasTicks
            >
              {recommendation ? (
                <RecommendationResultCard
                  recommendation={recommendation}
                />
              ) : (
                <div className="p-8 text-center border border-dashed border-border rounded-lg bg-surface-1">
                  <Sparkles className="w-8 h-8 text-accent mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-mono text-text-muted">
                    Select your criteria on the left and click "Run Material Recommendation Engine" to view ranked alloys with engineering justifications.
                  </p>
                </div>
              )}
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
};
