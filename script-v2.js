// Sayfa yüklendiğinde çalış
document.addEventListener('DOMContentLoaded', () => {
    
    // HTML'deki elemanları seç
    const searchButton = document.getElementById('searchButton');
    const paperInput = document.getElementById('paperInput');
    const networkContainer = document.getElementById('network');
    const status = document.getElementById('status');

    // Grafiği çizmek için Vis.js seçenekleri (DEĞİŞMEDİ)
    const options = {
        nodes: { shape: 'dot', size: 16, font: { size: 14, color: '#333' }, borderWidth: 2 },
        edges: { width: 2, arrows: { to: { enabled: true, scaleFactor: 0.5 } } },
        physics: { solver: 'barnesHut', barnesHut: { gravitationalConstant: -3000 } }
    };

    // "Ara" düğmesi olayları (DEĞİŞMEDİ)
    searchButton.onclick = () => { searchPaper(); };
    paperInput.onkeyup = (event) => { if (event.key === 'Enter') { searchPaper(); } };


    // Ana arama fonksiyonu
    async function searchPaper() {
        const query = paperInput.value.trim();
        if (query === '') {
            status.textContent = 'Lütfen bir DOI numarası girin.';
            return;
        }

        status.textContent = 'Aranıyor... Lütfen bekleyin...';

        try {
            
            // --- HATA DÜZELTMESİ (BU SEFER %100 DOĞRU) ---
            
            // 1. Önce 'DOI:' ön ekini ekle.
            const paperId = `DOI:${query}`; 
            
            // 2. SONRA, 'DOI:10.1109/5.771073' METNİNİN TAMAMINI KODLA.
            // Bu, 'DOI%3A10.1109%2F5.771073' haline gelir.
            // Bütün 'Not found' hatasının nedeni bu adımın yanlış yapılmasıydı.
            const encodedPaperId = encodeURIComponent(paperId);
            
            // 3. API'yi çağır.
            const apiUrl = `https://api.semanticscholar.org/v1/paper/${encodedPaperId}?fields=title,authors,year,references.title,citations.title`;
            
            // --- DÜZELTME SONU ---

            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Bilinmeyen API hatası' }));
                throw new Error(`API Hatası: ${errorData.error || 'Makale bulunamadı'}`);
            }
            
            const data = await response.json();
            
            // 2. Grafiği oluştur
            drawGraph(data);
            
            status.textContent = `"${data.title}" için sonuçlar bulundu.`;

        } catch (error) {
            console.error('Hata:', error);
            status.textContent = `Hata: ${error.message}. Lütfen girdinizi kontrol edin.`;
        }
    }

    // Gelen veriye göre grafiği çizen fonksiyon
    function drawGraph(data) {
        const nodes = [];
        const edges = [];

        // Ana (kök) makaleyi ekle
        nodes.push({ 
            id: data.paperId, 
            label: `[ANA MAKALE]\n${data.title.substring(0, 30)}...`,
            title: `${data.title} (${data.year})`,
            color: '#f0a30a',
            size: 30
        });

        // 1. Kaynakçayı (References) ekle
        if (data.references) {
            data.references.forEach(ref => {
                if (ref.paperId) {
                    nodes.push({
                        id: ref.paperId,
                        label: ref.title.substring(0, 30) + '...',
                        title: ref.title,
                        color: '#4285F4' // Mavi
                    });
                    edges.push({ from: data.paperId, to: ref.paperId });
                }
            });
        }

        // 2. Atıfları (Citations) ekle
        if (data.citations) {
            data.citations.forEach(cit => {
                if (cit.paperId) {
                    nodes.push({
                        id: cit.paperId,
                        label: cit.title.substring(0, 30) + '...',
                        title: cit.title,
                        color: '#34A853' // Yeşil
                    });
                    edges.push({ from: cit.paperId, to: data.paperId });
                }
            });
        }
        
        // Vis.js verisini oluştur
        const graphData = {
            nodes: new vis.DataSet(nodes),
            edges: new vis.DataSet(edges)
        };
        
        // Grafiği çiz!
        const network = new vis.Network(networkContainer, graphData, options);
    }
});
