// upload.js - Handle dream submission form

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('dreamForm');
    const dreamText = document.getElementById('dreamText');
    const charCount = document.querySelector('.char-count');

    const audioFile = document.getElementById('audioFile');
    const audioUpload = document.getElementById('audioUpload');

    // Character counter
    dreamText.addEventListener('input', function() {
        const count = this.value.length;
        charCount.textContent = `${count} / 5000 caracteres`;

        if (count > 4500) {
            charCount.style.color = 'var(--color-error)';
        } else {
            charCount.style.color = '';
        }
    });

    // File upload handlers (sonhos só tem áudio)
    setupFileUpload(audioFile, audioUpload, validateAudioFile);

    // Form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Validate form - at least text OR audio required
        const hasText = dreamText.value.trim();
        const hasAudio = audioFile.files[0];

        if (!hasText && !hasAudio) {
            showMessage('Por favor, conte seu sonho (texto ou áudio)', 'error');
            dreamText.focus();
            return;
        }

        if (!form.termsAccept.checked) {
            showMessage('Você precisa aceitar os termos de uso', 'error');
            return;
        }

        // Validate files
        if (audioFile.files[0] && !validateAudioFile(audioFile.files[0])) {
            return;
        }

        // Show loading
        showLoading(true);

        try {
            // Upload files first (if any)
            const audioUrl = audioFile.files[0] ? await uploadFile(audioFile.files[0], 'dream-media', 'audio/') : null;

            // Create dream object
            const dreamData = {
                text: dreamText.value.trim() || null,
                audio_url: audioUrl,
                session_id: getSessionId(),
                status: 'pending'
            };

            // Submit to Supabase
            const result = await createDream(dreamData);

            if (result.error) {
                throw new Error(result.error.message);
            }

            // Success!
            showLoading(false);
            showMessage('Sonho enviado com sucesso! Aguarde a moderação para publicação.', 'success', 5000);

            // Reset form after 2 seconds
            setTimeout(() => {
                form.reset();
                clearFileUploads();
                dreamText.dispatchEvent(new Event('input')); // Update char counter
            }, 2000);

        } catch (error) {
            console.error('Erro ao enviar sonho:', error);
            showLoading(false);
            showMessage('Erro ao enviar sonho. Tente novamente.', 'error');
        }
    });

    // Form reset handler
    form.addEventListener('reset', function() {
        setTimeout(() => {
            clearFileUploads();
            dreamText.dispatchEvent(new Event('input'));
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
