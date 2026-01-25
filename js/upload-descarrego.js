// upload-descarrego.js - Handle purge (descarrego) submission form

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('purgeForm');
    const purgeText = document.getElementById('purgeText');
    const charCount = document.querySelector('.char-count');

    // Character counter
    purgeText.addEventListener('input', function() {
        const count = this.value.length;
        charCount.textContent = `${count} / 10000 caracteres`;

        if (count > 9000) {
            charCount.style.color = 'var(--color-error)';
        } else {
            charCount.style.color = '';
        }
    });

    // Form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Validate form
        if (!purgeText.value.trim()) {
            showMessage('Por favor, conte seu descarrego', 'error');
            purgeText.focus();
            return;
        }

        if (!form.termsAccept.checked) {
            showMessage('Você precisa aceitar os termos de uso', 'error');
            return;
        }

        // Show loading
        showLoading(true);

        try {
            // Create purge object
            const purgeData = {
                text: purgeText.value.trim() || null,
                session_id: getSessionId(),
                status: 'pending'
            };

            // Submit to Supabase
            await createPurge(purgeData);

            // Success!
            showLoading(false);
            showMessage('Descarrego enviado com sucesso! Aguarde a moderação para publicação.', 'success', 5000);

            // Reset form after 2 seconds
            setTimeout(() => {
                form.reset();
                purgeText.dispatchEvent(new Event('input')); // Update char counter
            }, 2000);

        } catch (error) {
            console.error('Erro ao enviar descarrego:', error);
            showLoading(false);
            showMessage('Erro ao enviar descarrego. Tente novamente.', 'error');
        }
    });

    // Form reset handler
    form.addEventListener('reset', function() {
        setTimeout(() => {
            purgeText.dispatchEvent(new Event('input'));
        }, 0);
    });
});
