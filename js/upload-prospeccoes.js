// upload-prospeccoes.js - Handle prospection submission form

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('prospectionForm');
    const prospectionText = document.getElementById('prospectionText');
    const charCount = document.querySelector('.char-count');

    const audioFile = document.getElementById('audioFile');
    const audioUpload = document.getElementById('audioUpload');

    // Character counter
    prospectionText.addEventListener('input', function() {
        const count = this.value.length;
        charCount.textContent = `${count} / 5000 caracteres`;

        if (count > 4500) {
            charCount.style.color = 'var(--color-error)';
        } else {
            charCount.style.color = '';
        }
    });

    // File upload handler
    setupFileUpload(audioFile, audioUpload, validateAudioFile);

    // Form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Validate form - at least text OR audio required
        const hasText = prospectionText.value.trim();
        const hasAudio = audioFile.files[0];

        if (!hasText && !hasAudio) {
            showMessage('Por favor, conte sua prospecção (texto ou áudio)', 'error');
            prospectionText.focus();
            return;
        }

        if (!form.termsAccept.checked) {
            showMessage('Você precisa aceitar os termos de uso', 'error');
            return;
        }

        // Validate audio if present
        const audioValid = !audioFile.files[0] || validateAudioFile(audioFile.files[0]);

        if (!audioValid) {
            return; // Error message shown by validator
        }

        // Show loading
        showLoading(true);

        try {
            // Upload audio if present
            const audioUrl = audioFile.files[0] ? await uploadFile(audioFile.files[0], 'dream-media', 'audio/') : null;

            // Create prospection object
            const prospectionData = {
                text: prospectionText.value.trim() || null,
                audio_url: audioUrl,
                session_id: getSessionId(),
                status: 'pending'
            };

            // Submit to Supabase
            const result = await createProspection(prospectionData);

            if (result.error) {
                throw new Error(result.error.message);
            }

            // Success!
            showLoading(false);
            showMessage('Prospecção enviada com sucesso! Aguarde a moderação para publicação.', 'success', 5000);

            // Reset form after 2 seconds
            setTimeout(() => {
                form.reset();
                clearFileUploads();
                prospectionText.dispatchEvent(new Event('input')); // Update char counter
            }, 2000);

        } catch (error) {
            console.error('Erro ao enviar prospecção:', error);
            showLoading(false);
            showMessage('Erro ao enviar prospecção. Tente novamente.', 'error');
        }
    });

    // Form reset handler
    form.addEventListener('reset', function() {
        setTimeout(() => {
            clearFileUploads();
            prospectionText.dispatchEvent(new Event('input'));
        }, 0);
    });

    /**
     * Setup file upload UI and validation
     */
    function setupFileUpload(inputElement, containerElement, validatorFn) {
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
        });

        // Remove file
        removeBtn.addEventListener('click', function() {
            inputElement.value = '';
            clearFileUpload(containerElement);
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
    }
});
