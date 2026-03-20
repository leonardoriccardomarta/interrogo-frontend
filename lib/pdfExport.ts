export const exportResultsToPDF = async (results: any, sessionInfo: any) => {
  // Dinamicamente import per evitare SSR issues
  const html2pdf = (await import('html2pdf.js')).default;

  const element = document.createElement('div');
  element.innerHTML = `
    <div style="font-family: Arial, sans-serif; padding: 40px; color: #333;">
      <h1 style="text-align: center; color: #1f2937; margin-bottom: 30px;">
        📊 Rapporto Interrogazione
      </h1>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
        <h2 style="color: #0f172a; margin-bottom: 15px;">Informazioni Sessione</h2>
        <p><strong>Argomento:</strong> ${sessionInfo.topic}</p>
        <p><strong>Data:</strong> ${new Date().toLocaleDateString('it-IT')}</p>
        <p><strong>Difficoltà:</strong> ${sessionInfo.difficulty}/10</p>
        <p><strong>Personalità Professore:</strong> 
          ${sessionInfo.personality === 'strict' ? '😤 Rigoroso' : '😊 Incoraggiante'}
        </p>
      </div>

      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; text-align: center; margin-bottom: 30px;">
        <h2 style="margin: 0 0 10px 0; font-size: 48px;">
          ${results.score.toFixed(1)}
        </h2>
        <p style="margin: 0; font-size: 24px;">/ 10</p>
      </div>

      <div style="margin-bottom: 30px;">
        <h2 style="color: #0f172a; margin-bottom: 20px;">✅ Punti di Forza</h2>
        ${results.strengths.map(s => `
          <div style="background: #dcfce7; padding: 15px; margin-bottom: 10px; border-left: 4px solid #22c55e; border-radius: 4px;">
            <p style="margin: 0; color: #15803d;"><strong>✓</strong> ${s}</p>
          </div>
        `).join('')}
      </div>

      <div style="margin-bottom: 30px;">
        <h2 style="color: #0f172a; margin-bottom: 20px;">⚠️ Aree da Migliorare</h2>
        ${results.weaknesses.map(w => `
          <div style="background: #fef3c7; padding: 15px; margin-bottom: 10px; border-left: 4px solid #f59e0b; border-radius: 4px;">
            <p style="margin: 0; color: #b45309;">• ${w}</p>
          </div>
        `).join('')}
      </div>

      <div style="margin-bottom: 30px;">
        <h2 style="color: #0f172a; margin-bottom: 20px;">💡 Suggerimenti</h2>
        ${results.suggestions.map(s => `
          <div style="background: #dbeafe; padding: 15px; margin-bottom: 10px; border-left: 4px solid #3b82f6; border-radius: 4px;">
            <p style="margin: 0; color: #1e40af;">→ ${s}</p>
          </div>
        `).join('')}
      </div>

      <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb; margin-top: 30px;">
        <p style="color: #6b7280; font-size: 12px;">
          Generato da Interrogo - ${new Date().toLocaleString('it-IT')}
        </p>
      </div>
    </div>
  `;

  const options = {
    margin: 10,
    filename: `Interrogazione_${sessionInfo.topic}_${new Date().toISOString().split('T')[0]}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { orientation: 'portrait' as const, unit: 'mm' as const, format: 'a4' as const }
  };

  html2pdf().set(options).from(element).save();
};
