-- CNC SmartCore Module 2: Seed Data (Sample Data)
-- All entries are clearly flagged as sample data (is_sample_data = true)

-- Sample Materials
-- Worked vector: AL6061-T6 (density 2700 kg/m3, kc 700 N/mm2, Vc 200-300 m/min, fz_factor 0.003)
INSERT INTO public.materials (
    id, code, name, category, density_kg_m3, kc_n_mm2,
    vc_min_m_min, vc_max_m_min, fz_factor,
    strength_rating, lightness_rating, corrosion_rating, machinability_rating,
    cost_level, cost_per_kg, suitable_applications, notes, is_sample_data, is_active
) VALUES
(
    '11111111-1111-1111-1111-111111111101', 'AL6061-T6', 'Aluminium 6061-T6', 'ALUMINIUM',
    2700, 700, 200, 300, 0.003,
    3, 4, 4, 5,
    2, 350.00, ARRAY['structural_bracket', 'housing', 'fixture'],
    'Standard aerospace & prototyping aluminum. Excellent machinability.', true, true
),
(
    '11111111-1111-1111-1111-111111111102', 'STEEL-1018', 'Mild Steel AISI 1018', 'STEEL',
    7850, 1500, 90, 140, 0.002,
    4, 2, 2, 3,
    1, 120.00, ARRAY['structural_bracket', 'shaft', 'weldment'],
    'General purpose low-carbon mild steel.', true, true
),
(
    '11111111-1111-1111-1111-111111111103', 'SS-304', 'Stainless Steel 304', 'STAINLESS',
    8000, 2100, 60, 100, 0.0015,
    4, 2, 5, 2,
    4, 550.00, ARRAY['food_grade', 'chemical', 'marine'],
    'Corrosion resistant austenitic stainless steel. High work hardening.', true, true
),
(
    '11111111-1111-1111-1111-111111111104', 'DELRIN', 'Acetal / Delrin (POM)', 'PLASTIC',
    1410, 350, 250, 450, 0.004,
    2, 5, 5, 5,
    2, 420.00, ARRAY['insulator', 'bushing', 'prototype'],
    'Engineering thermoplastic with great dimensional stability.', true, true
)
ON CONFLICT (id) DO NOTHING;

-- Sample Machine Profiles
INSERT INTO public.machine_profiles (
    id, name, controller_dialect, travel_x_mm, travel_y_mm, travel_z_mm,
    max_rpm, rated_power_kw, spindle_efficiency, rapid_feed_mm_min, max_feed_mm_min,
    tool_change_s, machine_rate_per_hr, idle_power_kw, is_sample_data, is_active
) VALUES
(
    '22222222-2222-2222-2222-222222222201', 'Haas VF-2 (Sample Profile)', 'GENERIC_ISO',
    762, 406, 508,
    10000, 22.4, 0.85, 25400, 16500,
    4.5, 750.00, 0.8, true, true
),
(
    '22222222-2222-2222-2222-222222222202', 'Benchtop CNC Mill (Sample Profile)', 'GENERIC_ISO',
    300, 180, 200,
    8000, 1.5, 0.80, 5000, 3000,
    15.0, 300.00, 0.2, true, true
)
ON CONFLICT (id) DO NOTHING;

-- Sample Cutting Tools
INSERT INTO public.cutting_tools (
    id, name, tool_type, diameter_mm, flute_count, flute_length_mm, overall_length_mm,
    tool_material, center_cutting, price, expected_life_min, is_sample_data, is_active
) VALUES
(
    '33333333-3333-3333-3333-333333333301', '10mm Carbide Flat End Mill (3 Flute)', 'FLAT_END_MILL',
    10.0, 3, 25.0, 75.0,
    'CARBIDE', true, 1800.00, 120, true, true
),
(
    '33333333-3333-3333-3333-333333333302', '6mm Carbide Flat End Mill (4 Flute)', 'FLAT_END_MILL',
    6.0, 4, 18.0, 60.0,
    'CARBIDE', true, 1200.00, 90, true, true
),
(
    '33333333-3333-3333-3333-333333333303', '50mm Face Mill (Carbide Inserts)', 'FACE_MILL',
    50.0, 4, 8.0, 50.0,
    'CARBIDE', false, 4500.00, 240, true, true
)
ON CONFLICT (id) DO NOTHING;
