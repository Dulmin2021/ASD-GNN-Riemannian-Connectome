# Sample fMRI Test Scans for ASD Connectome Web Application

This directory contains standardized, pre-formatted resting-state fMRI test volumes (.nii.gz) designed for drag-and-drop testing in the clinical web application.

## Available Test Scans

| Filename | ABIDE Site | Condition / Use Case | Volume Dimensions | Approx. Size |
| :--- | :--- | :--- | :--- | :--- |
| NYU_0050952_rest_bold.nii.gz | **NYU** | High-Confidence ASD Profile | 32x32x16x50 (TR = 2.0s) | ~2.67 MB |
| Stanford_0051161_rest_bold.nii.gz | **STANFORD** | Typical Control (TC) Baseline | 32x32x16x50 (TR = 2.0s) | ~2.67 MB |
| Caltech_0051461_rest_bold.nii.gz | **CALTECH** | ASD Variant with Inter-Hemispheric Disconnection | 32x32x16x50 (TR = 2.0s) | ~2.67 MB |
| Yale_0050551_rest_bold.nii.gz | **YALE** | Typical Control (TC) Baseline | 32x32x16x50 (TR = 2.0s) | ~2.67 MB |

## How to Test in the Web App

1. Launch the web application:
   cd "H:\My Drive\ASD_GNN_Research2\webapp\dist"
   python -m http.server 3000

2. Open http://localhost:3000 in your browser.
3. On the Upload Scan page, drag and drop any of these .nii.gz files into the dropzone.
4. Select the matching Acquisition Site (e.g., NYU for NYU_0050952_rest_bold.nii.gz).
5. Click Run Diagnosis.
