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
    paperInput.onkeyup = (event) => { if (event.key === 'Enter') searchPaper(); };

    async function searchPaper() {
        const query = paperInput.value.trim();
        if (query === '') {
            status.textContent = 'Lütfen bir DOI numarası girin.';
            return;
        }

        status.textContent = 'Aranıyor... Lütfen bekleyin...';

        try {
            // ✅ Yeni proxy (daha kararlı)
            const proxy = "https://corsproxy.io/?";
            const apiUrl = `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(query)}?fields=title,year,references.title,references.paperId,citations.title,citations.paperId`;
            const fullUrl = proxy + encodeURIComponent(apiUrl);

            const response = await fetch(fullUrl);
            if (!response.ok) throw new Error(`API Hatası: ${response.statusText}`);

            const data = await response.json();

            if (!data.title) {
                status.textContent = 'Makale bulunamadı. Lütfen geçerli bir DOI girin.';
                return;
            }

            drawGraph(data);
            status.textContent = `"${data.title}" için sonuçlar bulundu.`;

        } catch (error) {
            console.error('Hata:', error);
            status.textContent = `Hata: ${error.message}. Lütfen DOI'yi kontrol edin veya daha sonra tekrar deneyin.`;
        }
    }

    function drawGraph(data) {
        const nodes = [];
        const edges = [];

        nodes.push({
            id: data.paperId,
            label: `[ANA MAKALE]\n${data.title.substring(0, 30)}...`,
            title: `${data.title} (${data.year || 'Yıl yok'})`,
            color: '#f0a30a',
            size: 30
        });

        if (data.references) {
            data.references.forEach(ref => {
                if (ref.paperId && ref.title) {
                    nodes.push({
                        id: ref.paperId,
                        label: ref.title.substring(0, 30) + '...',
                        title: ref.title,
                        color: '#4285F4'
                    });
                    edges.push({ from: data.paperId, to: ref.paperId });
                }
            });
        }

        if (data.citations) {
            data.citations.forEach(cit => {
                if (cit.paperId && cit.title) {
                    nodes.push({
                        id: cit.paperId,
                        label: cit.title.substring(0, 30) + '...',
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
