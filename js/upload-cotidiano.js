// upload-cotidiano.js - Handle daily life submission form

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('dailyForm');
    const audioFile = document.getElementById('audioFile');
    const imageFile = document.getElementById('imageFile');
    const videoFile = document.getElementById('videoFile');

    const audioUpload = document.getElementById('audioUpload');
    const imageUpload = document.getElementById('imageUpload');
    const videoUpload = document.getElementById('videoUpload');
    const imagePreview = document.getElementById('imagePreview');

    // File upload handlers
    setupFileUpload(audioFile, audioUpload, validateAudioFile);
    setupFileUpload(imageFile, imageUpload, validateImageFile, showImagePreview);
    setupFileUpload(videoFile, videoUpload, validateVideoFile);

    // Form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Validate that at least one file is selected
        const hasAudio = audioFile.files[0];
        const hasImage = imageFile.files[0];
        const hasVideo = videoFile.files[0];

        if (!hasAudio && !hasImage && !hasVideo) {
            showMessage('Por favor, selecione pelo menos um arquivo (áudio, foto ou vídeo)', 'error');
            return;
        }

        if (!form.termsAccept.checked) {
            showMessage('Você precisa aceitar que não há rostos e os termos de uso', 'error');
            return;
        }

        // Validate files
        const audioValid = !hasAudio || validateAudioFile(audioFile.files[0]);
        const imageValid = !hasImage || validateImageFile(imageFile.files[0]);
        const videoValid = !hasVideo || validateVideoFile(videoFile.files[0]);

        if (!audioValid || !imageValid || !videoValid) {
            return; // Error messages shown by validators
        }

        // Show loading
        showLoading(true);

        try {
            // Upload files
            let audioUrl = null;
            let imageUrl = null;
            let videoUrl = null;

            if (hasAudio) {
                audioUrl = await uploadFile(audioFile.files[0], 'dream-media', 'daily/audio/');
            }
            if (hasImage) {
                imageUrl = await uploadFile(imageFile.files[0], 'dream-media', 'daily/images/');
            }
            if (hasVideo) {
                videoUrl = await uploadFile(videoFile.files[0], 'dream-media', 'daily/videos/');
            }

            // Create daily life object
            const dailyData = {
                audio_url: audioUrl,
                photo_url: imageUrl,
                video_url: videoUrl,
                session_id: getSessionId(),
                status: 'pending'
            };

            // Submit to Supabase
            await createDaily(dailyData);

            // Success!
            showLoading(false);
            showMessage('Cotidiano enviado com sucesso! Aguarde a moderação para publicação.', 'success', 5000);

            // Reset form after 2 seconds
            setTimeout(() => {
                form.reset();
                clearFileUploads();
            }, 2000);

        } catch (error) {
            console.error('Erro ao enviar cotidiano:', error);
            console.error('Stack trace:', error.stack);
            console.error('Error message:', error.message);
            showLoading(false);
            showMessage(`Erro ao enviar cotidiano: ${error.message}`, 'error');
        }
    });

    // Form reset handler
    form.addEventListener('reset', function() {
        setTimeout(() => {
            clearFileUploads();
        }, 0);
    });

    /**
     * Setup file upload UI and validation
     */
    function setupFileUpload(inputElement, containerElement, validatorFn, previewFn = null) {
        const label = containerElement.querySelector('.file-upload-label');
        const fileNameSpan = containerElement.querySelector('.file-name');
        const removeBtn = containerElement.querySelector('.remove-file');

        // File selection
        inputElement.addEventListener('change', function() {
            const file = this.files[0];

            if (!file) {
                clearFileUpload(containerElement);
                return;
            }

            // Validate
            if (!validatorFn(file)) {
                this.value = '';
                clearFileUpload(containerElement);
                return;
            }

            // Update UI
            containerElement.classList.add('has-file');
            fileNameSpan.textContent = file.name;
            removeBtn.hidden = false;

            // Show preview if applicable
            if (previewFn && file.type.startsWith('image/')) {
                previewFn(file);
            }
        });

        // Remove file
        removeBtn.addEventListener('click', function() {
            inputElement.value = '';
            clearFileUpload(containerElement);
            if (previewFn) {
                imagePreview.hidden = true;
                imagePreview.style.backgroundImage = '';
            }
        });

        // Drag and drop
        label.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('dragover');
        });

        label.addEventListener('dragleave', function() {
            this.classList.remove('dragover');
        });

        label.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('dragover');

            const file = e.dataTransfer.files[0];
            if (file) {
                inputElement.files = e.dataTransfer.files;
                inputElement.dispatchEvent(new Event('change'));
            }
        });
    }

    /**
     * Clear file upload UI
     */
    function clearFileUpload(containerElement) {
        containerElement.classList.remove('has-file');
        const fileNameSpan = containerElement.querySelector('.file-name');
        const removeBtn = containerElement.querySelector('.remove-file');

        fileNameSpan.textContent = '';
        removeBtn.hidden = true;
    }

    /**
     * Clear all file uploads
     */
    function clearFileUploads() {
        clearFileUpload(audioUpload);
        clearFileUpload(imageUpload);
        clearFileUpload(videoUpload);
        imagePreview.hidden = true;
        imagePreview.style.backgroundImage = '';
    }

    /**
     * Show image preview
     */
    function showImagePreview(file) {
        const reader = new FileReader();

        reader.onload = function(e) {
            imagePreview.style.backgroundImage = `url(${e.target.result})`;
            imagePreview.hidden = false;
        };

        reader.readAsDataURL(file);
    }
});
