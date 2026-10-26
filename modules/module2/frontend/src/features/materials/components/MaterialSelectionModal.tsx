import React, { useState, useEffect } from 'react';
import { Material, MaterialRecommendationRequest, MaterialRecommendationResponse } from '../types';
import { materialsApi } from '../api';
import { MaterialCatalogTable } from './MaterialCatalogTable';
import { RecommendationForm } from './RecommendationForm';
import { RecommendationResultCard } from './RecommendationResultCard';
import { X, Sparkles, BookOpen } from 'lucide-react';
import { LabelChip } from '@/components/domain/LabelChip';

interface MaterialSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  cadVersionId: string;
  currentMaterialId?: string | null;
  onMaterialSelected: (updatedMaterialId: string) => void;
}

export const MaterialSelectionModal: React.FC<MaterialSelectionModalProps> = ({
  isOpen,
  onClose,
  cadVersionId,
  currentMaterialId,
  onMaterialSelected,
}) => {
  const [activeTab, setActiveTab] = useState<'recommend' | 'catalog'>('recommend');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [recommendation, setRecommendation] = useState<MaterialRecommendationResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Load materials and latest recommendation if exists
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [mats, latestRec] = await Promise.all([
          materialsApi.getMaterials(),
          materialsApi.getLatestRecommendation(cadVersionId),
        ]);
        setMaterials(mats);
        if (latestRec) {
          setRecommendation(latestRec);
        }
      } catch (err) {
        console.error('Failed to load materials data', err);
        setError('Failed to fetch materials database.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isOpen, cadVersionId]);

  if (!isOpen) return null;

  const handleRunRecommendation = async (request: MaterialRecommendationRequest) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await materialsApi.recommendMaterials(cadVersionId, request);
      setRecommendation(res);
    } catch (err) {
      console.error('Failed to generate recommendation', err);
      setError('Recommendation engine failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectMaterial = async (materialId: string) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await materialsApi.selectMaterial(cadVersionId, materialId);
      onMaterialSelected(materialId);
      onClose();
    } catch (err) {
      console.error('Failed to save material selection', err);
      setError('Failed to assign material to CAD version.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-surface-base border border-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-surface-1">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-text">Material Assignment & Recommendations</h2>
              <LabelChip type="rule-based" />
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Select or compute the optimal alloy for physical density, cutting power, and cycle estimation.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-border bg-surface-base px-4">
          <button
            type="button"
            onClick={() => setActiveTab('recommend')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-mono font-medium border-b-2 transition-colors ${
              activeTab === 'recommend'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Rule-Based Advisor</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-mono font-medium border-b-2 transition-colors ${
              activeTab === 'catalog'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Browse Full Catalog</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3 bg-danger/10 border border-danger/30 text-danger text-xs rounded-md">
              {error}
            </div>
          )}

          {activeTab === 'recommend' ? (
            <div className="space-y-6">
              <div className="p-4 bg-surface-1 border border-border rounded-lg">
                <RecommendationForm
                  onSubmit={handleRunRecommendation}
                  isLoading={isSubmitting}
                />
              </div>

              {recommendation && (
                <div className="space-y-2">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-text-muted">
                    Ranked Material Candidates
                  </h3>
                  <RecommendationResultCard
                    recommendation={recommendation}
                    selectedMaterialId={currentMaterialId}
                    onSelectMaterial={handleSelectMaterial}
                    isSelecting={isSubmitting}
                  />
                </div>
              )}
            </div>
          ) : (
            <MaterialCatalogTable
              materials={materials}
              selectedMaterialId={currentMaterialId}
              onSelect={(m) => handleSelectMaterial(m.id)}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
};
