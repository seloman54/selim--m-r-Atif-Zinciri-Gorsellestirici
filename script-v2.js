// Sayfa yüklendiğinde çalış
document.addEventListener('DOMContentLoaded', () => {
    const searchButton = document.getElementById('searchButton');
    const paperInput = document.getElementById('paperInput');
    const networkContainer = document.getElementById('network');
    const status = document.getElementById('status');

    const options = {
        nodes: { shape: 'dot', size: 16, font: { size: 14, color: '#333' }, borderWidth: 2 },
        edges: { width: 2, arrows: { to: { enabled: true, scaleFactor: 0.5 } } },
        physics: { solver: 'barnesHut', barnesHut: { gravitationalConstant: -3000 } }
    };

    searchButton.onclick = () => searchPaper();
    paperInput.onkeyup = (e) => { if (e.key === 'Enter') searchPaper(); };

    async function searchPaper() {
        const query = paperInput.value.trim();
        if (query === '') {
            status.textContent = 'Lütfen bir DOI numarası girin.';
            return;
        }

        status.textContent = 'Aranıyor... Lütfen bekleyin...';

        // Önce Semantic Scholar API’yi dene
        try {
            const apiUrl = `https://api.semanticscholar.org/graph/v1/paper/DOI:${query}?fields=title,authors,year,references.paperId,references.title,citations.paperId,citations.title`;

            const response = await fetch(apiUrl, { mode: 'cors' });
            if (!response.ok) throw new Error("Semantic Scholar'da bulunamadı.");

            const data = await response.json();
            drawGraph(data);
            status.textContent = `"${data.title}" için sonuçlar bulundu.`;
            return;
        } catch (error) {
            console.warn('Semantic Scholar API başarısız, Crossref’e geçiliyor...', error);
        }

        // Eğer buraya geldiyse, Crossref API’yi dene
        try {
            const crossrefUrl = `https://api.crossref.org/works/${query}`;
            const response = await fetch(crossrefUrl, { mode: 'cors' });

            if (!response.ok) throw new Error("Crossref'te de bulunamadı.");

            const crossData = await response.json();
            const item = crossData.message;

            // Crossref verisinden basit bir düğüm oluştur
            const data = {
                paperId: item.DOI,
                title: item.title ? item.title[0] : 'Başlık bulunamadı',
                year: item.published && item.published['date-parts'] ? item.published['date-parts'][0][0] : 'Yıl yok',
                authors: item.author ? item.author.map(a => a.family).join(', ') : 'Yazar bilgisi yok',
                references: [],
                citations: []
            };

            drawGraph(data);
            status.textContent = `"${data.title}" Crossref üzerinden getirildi.`;
        } catch (error) {
            console.error('Crossref API hatası:', error);
            status.textContent = 'Hata: DOI hem Semantic Scholar hem de Crossref üzerinde bulunamadı.';
        }
    }

    function drawGraph(data) {
        const nodes = [];
        const edges = [];

        nodes.push({
            id: data.paperId,
            label: `[ANA MAKALE]\n${data.title.substring(0, 40)}...`,
            title: `${data.title} (${data.year})`,
            color: '#f0a30a',
            size: 30
        });

        if (data.references && data.references.length > 0) {
            data.references.forEach(ref => {
                if (ref.paperId) {
                    nodes.push({
                        id: ref.paperId,
                        label: ref.title ? ref.title.substring(0, 30) + '...' : 'Referans',
                        title: ref.title,
                        color: '#4285F4'
                    });
                    edges.push({ from: data.paperId, to: ref.paperId });
                }
            });
        }

        if (data.citations && data.citations.length > 0) {
            data.citations.forEach(cit => {
                if (cit.paperId) {
                    nodes.push({
                        id: cit.paperId,
                        label: cit.title ? cit.title.substring(0, 30) + '...' : 'Atıf',
                        title: cit.title,
                        color: '#34A853'
                    });
                    edges.push({ from: cit.paperId, to: data.paperId });
                }
            });
        }

        const graphData = {
            nodes: new vis.DataSet(nodes),
            edges: new vis.DataSet(edges)
        };

        new vis.Network(networkContainer, graphData, options);
    }
});
