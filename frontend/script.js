document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('image-form');
    const uploadInput = document.getElementById('image-upload');
    const dropzone = document.getElementById('dropzone');
    const fileNameDisplay = document.getElementById('file-name');
    const qualityInput = document.getElementById('quality');
    const qualityValueLabel = document.getElementById('quality-value');
    const submitBtn = document.getElementById('submit-btn');
    
    const resultSection = document.getElementById('result-section');
    const resultPreview = document.getElementById('result-preview');
    const downloadBtn = document.getElementById('download-btn');
    
    // Stats Elements
    const statOriginalSize = document.getElementById('original-size');
    const statProcessedSize = document.getElementById('processed-size');
    const statSpaceSaved = document.getElementById('space-saved');

    // Keep track of the current processed blob URL to allow downloading
    let currentProcessedBlobUrl = null;
    let currentFilename = 'processed-image';

    // Update quality range value display
    qualityInput.addEventListener('input', (e) => {
        qualityValueLabel.textContent = e.target.value;
    });

    // File input change handler (Update file name in UI)
    uploadInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            fileNameDisplay.textContent = e.target.files[0].name;
            dropzone.classList.add('has-file');
        } else {
            fileNameDisplay.textContent = '';
            dropzone.classList.remove('has-file');
        }
    });

    // Drag and drop functionality
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => dropzone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => dropzone.classList.remove('dragover'), false);
    });

    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            uploadInput.files = files; // Assign files to input
            uploadInput.dispatchEvent(new Event('change')); // Trigger change event
        }
    });

    // Utility to format bytes
    const formatBytes = (bytes, decimals = 2) => {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    };

    // Form submission handler
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (uploadInput.files.length === 0) {
            alert('Please select an image file first.');
            return;
        }

        const formData = new FormData(form);
        const originalFile = uploadInput.files[0];
        
        // Define base filename for download
        const nameParts = originalFile.name.split('.');
        const noExt = nameParts.slice(0, -1).join('.');
        const formatChoice = document.getElementById('format').value;
        const removeBgChecked = document.getElementById('removeBg').checked;
        currentFilename = `${noExt}-pro.${formatChoice}`;

        // UI Loading State
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
        const btnTextContainer = submitBtn.querySelector('.btn-text');
        const originalBtnText = btnTextContainer.textContent;
        // Optionally update text, though CSS hides it when .loading is present.
        // We'll trust the spinner.
        
        resultSection.classList.add('hidden');

        try {
            // Note: Update URL if backend is on a different host/port
            const response = await fetch('http://localhost:3000/api/process-image', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Server error processing image.');
            }

            // Extract custom headers
            const originalSizeStr = response.headers.get('x-original-size');
            const processedSizeStr = response.headers.get('x-processed-size');
            
            const originalSizeBytes = originalSizeStr ? parseInt(originalSizeStr, 10) : originalFile.size;
            const processedSizeBytes = processedSizeStr ? parseInt(processedSizeStr, 10) : 0;
            
            // Get Blob from response
            const blob = await response.blob();
            
            // If previous blob URL exists, revoke it to avoid memory leaks
            if (currentProcessedBlobUrl) {
                URL.revokeObjectURL(currentProcessedBlobUrl);
            }
            
            // Create Object URL for frontend preview
            currentProcessedBlobUrl = URL.createObjectURL(blob);
            
            // Update UI with Results
            resultPreview.src = currentProcessedBlobUrl;
            
            statOriginalSize.textContent = formatBytes(originalSizeBytes);
            statProcessedSize.textContent = formatBytes(processedSizeBytes || blob.size);
            
            // Calculate Savings
            const savingsBytes = originalSizeBytes - (processedSizeBytes || blob.size);
            if (savingsBytes > 0) {
                const percent = ((savingsBytes / originalSizeBytes) * 100).toFixed(1);
                statSpaceSaved.textContent = `${percent}%`;
                statSpaceSaved.parentElement.classList.add('savings');
                statSpaceSaved.parentElement.style.color = 'var(--success)';
            } else {
                statSpaceSaved.textContent = `N/A (Size Increased)`;
                statSpaceSaved.parentElement.style.color = '#ef4444'; // Red
            }

            // Show Result Section
            resultSection.classList.remove('hidden');
            // Scroll to results
            resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        } catch (error) {
            console.error('Error:', error);
            alert(`Processing failed: ${error.message}`);
        } finally {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    });

    // Download Button Logic
    downloadBtn.addEventListener('click', () => {
        if (!currentProcessedBlobUrl) return;
        
        const a = document.createElement('a');
        a.href = currentProcessedBlobUrl;
        a.download = currentFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });
});
