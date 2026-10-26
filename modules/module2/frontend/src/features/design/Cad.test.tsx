import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { UploadDialog } from './components/UploadDialog';
import { AiAdvisorPanel } from './components/AiAdvisorPanel';
import { PartViewer } from './components/PartViewer';

describe('CAD Management & Viewer Components', () => {
  it('renders UploadDialog with file dropzone, units, and name input', () => {
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    render(
      <UploadDialog
        isOpen={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    );

    expect(screen.getByText('Upload CAD Model')).toBeInTheDocument();
    expect(screen.getByText(/Drag and drop your CAD file here/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. Engine Mounting Bracket/i)).toBeInTheDocument();
    expect(screen.getByText(/Millimeters \(mm\) \[Standard\]/i)).toBeInTheDocument();
    expect(screen.getByText(/Inches \(in\)/i)).toBeInTheDocument();

    // Close button triggers onClose
    const closeBtn = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders AiAdvisorPanel with Kaggle benchmark dataset advisory and mandatory labels', () => {
    const sampleAiData = {
      risk_score: 15,
      risk_category: 'LOW',
      geometry_flags: {
        thin_wall_risk: false,
        aspect_ratio_risk: false,
        extreme_volume_risk: false,
        non_watertight_mesh: false,
      },
      recommended_parameters: {
        dataset_source: 'Kaggle CNC Milling Empirical Machining Benchmark',
        benchmark_material: 'AL6061-T6',
        recommended_rpm: 7958,
        recommended_feed_mmpm: 955.0,
        cutting_speed_vc_m_min: 250.0,
        feed_per_tooth_fz_mm: 0.04,
        ap_depth_mm: 3.0,
        ae_width_mm: 5.0,
        mrr_cm3_min: 14.32,
        estimated_cutting_force_n: 350.0,
        estimated_spindle_power_kw: 1.25,
        estimated_tool_life_min: 180.0,
        expected_roughness_ra_um: 0.8,
        dataset_hardness_hb: 95.0,
      },
      warnings: ['Mesh density normal.'],
    };

    render(<AiAdvisorPanel aiDataRaw={JSON.stringify(sampleAiData)} />);

    expect(screen.getByText(/AI Machinability & Empirical Advisory/i)).toBeInTheDocument();
    // Mandatory honesty chips
    expect(screen.getAllByText(/Rule-based recommendation/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Estimate/i)).toBeInTheDocument();
    expect(screen.getByText(/Risk indicator — not collision guarantee/i)).toBeInTheDocument();

    // Kaggle provenance
    expect(screen.getByText(/Kaggle CNC Milling Benchmark/i)).toBeInTheDocument();

    // Predicted Parameters
    expect(screen.getByText('7,958')).toBeInTheDocument();
    expect(screen.getByText('955')).toBeInTheDocument();
    expect(screen.getByText('LOW RISK')).toBeInTheDocument();
    expect(screen.getByText(/Mesh density normal\./i)).toBeInTheDocument();
  });

  it('renders PartViewer fallback and download option when preview status is FAILED', () => {
    render(
      <PartViewer
        previewStatus="FAILED"
        previewError="Malformed STL geometry header."
        downloadUrl="/api/v1/storage/cad-files/bad.stl"
        format="STL"
      />
    );

    expect(screen.getByText(/3D Preview Failed/i)).toBeInTheDocument();
    expect(screen.getByText(/Malformed STL geometry header\./i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Download Raw STL File/i })).toHaveAttribute(
      'href',
      '/api/v1/storage/cad-files/bad.stl'
    );
  });

  it('renders PartViewer navigation toolbar with view presets', () => {
    render(
      <PartViewer
        previewStatus="READY"
        format="STL"
      />
    );

    expect(screen.getByTitle('Isometric View')).toBeInTheDocument();
    expect(screen.getByTitle('Top View (Z-Up)')).toBeInTheDocument();
    expect(screen.getByTitle('Front View')).toBeInTheDocument();
    expect(screen.getByTitle('Right Side View')).toBeInTheDocument();
    expect(screen.getByTitle('Toggle Wireframe')).toBeInTheDocument();
    expect(screen.getByTitle('Toggle Worktable Grid')).toBeInTheDocument();
  });
});
