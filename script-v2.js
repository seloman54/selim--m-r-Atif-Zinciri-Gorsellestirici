document.addEventListener('DOMContentLoaded', () => {
    const searchButton = document.getElementById('searchButton');
    const paperInput = document.getElementById('paperInput');
    const networkContainer = document.getElementById('network');
    const status = document.getElementById('status');

    const options = {
        nodes: { 
            shape: 'dot', 
            size: 18, 
            font: { size: 13, color: '#222' },
            borderWidth: 2
        },
        edges: { width: 2, color: { color: '#999' }, arrows: { to: { enabled: true } } },
        physics: { solver: 'barnesHut', barnesHut: { gravitationalConstant: -3000 } },
        interaction: { hover: true }
    };

    searchButton.onclick = () => searchPaper();
    paperInput.onkeyup = (e) => { if (e.key === 'Enter') searchPaper(); };

    async function searchPaper() {
        const query = paperInput.value.trim();
        if (query === '') {
            status.textContent = 'Lütfen bir DOI numarası girin.';
            return;
        }

        status.textContent = '🔍 Aranıyor... Lütfen bekleyin...';
        const proxy = 'https://api.allorigins.win/raw?url=';

        // 1️⃣ SEMANTIC SCHOLAR
        try {
            const encodedUrl = encodeURIComponent(
                `https://api.semanticscholar.org/graph/v1/paper/DOI:${query}?fields=title,authors,year,url,references.paperId,references.title,references.url,citations.paperId,citations.title,citations.url`
            );
            const response = await fetch(`${proxy}${encodedUrl}`);
            if (!response.ok) throw new Error('Semantic Scholar hatası');
            const data = await response.json();
            drawGraph(data);
            status.textContent = `✅ "${data.title}" için Semantic Scholar verisi getirildi.`;
            return;
        } catch (error) {
            console.warn('Semantic Scholar başarısız:', error);
        }

        // 2️⃣ CROSSREF YEDEK
        try {
            const encodedUrl = encodeURIComponent(`https://api.crossref.org/works/${query}`);
            const response = await fetch(`${proxy}${encodedUrl}`);
            if (!response.ok) throw new Error('Crossref hatası');
            const crossData = await response.json();
            const item = crossData.message;
            const data = {
                paperId: item.DOI,
                title: item.title ? item.title[0] : 'Başlık bulunamadı',
                year: item['published-print']?.['date-parts']?.[0]?.[0] || 'Yıl yok',
                authors: item.author ? item.author.map(a => a.family).join(', ') : 'Yazar bilgisi yok',
                url: item.URL,
                references: [],
                citations: []
            };
            drawGraph(data);
            status.textContent = `ℹ️ "${data.title}" Crossref üzerinden getirildi.`;
        } catch (error) {
            console.error('Crossref API hatası:', error);
            status.textContent = '❌ Hata: DOI hem Semantic Scholar hem Crossref üzerinden alınamadı.';
        }
    }

    function drawGraph(data) {
        const nodes = [];
        const edges = [];

        nodes.push({
            id: data.paperId,
            label: `[ANA]\n${data.title.substring(0, 40)}...`,
            title: `${data.title}\n${data.authors || ''}\n(${data.year})`,
            color: '#f0a30a',
            size: 30,
            url: data.url
        });

        if (data.references?.length > 0) {
            data.references.forEach(ref => {
                if (ref.paperId) {
                    nodes.push({
                        id: ref.paperId,
                        label: ref.title ? ref.title.substring(0, 30) + '...' : 'Referans',
                        title: ref.title || 'Referans',
                        color: '#4285F4',
                        url: ref.url
                    });
                    edges.push({ from: data.paperId, to: ref.paperId });
                }
            });
        }

        if (data.citations?.length > 0) {
            data.citations.forEach(cit => {
                if (cit.paperId) {
                    nodes.push({
                        id: cit.paperId,
                        label: cit.title ? cit.title.substring(0, 30) + '...' : 'Atıf',
                        title: cit.title || 'Atıf',
                        color: '#34A853',
                        url: cit.url
                    });
                    edges.push({ from: cit.paperId, to: data.paperId });
                }
            });
        }

        const graphData = {
            nodes: new vis.DataSet(nodes),
            edges: new vis.DataSet(edges)
        };

        const network = new vis.Network(networkContainer, graphData, options);

        // 🌐 Düğüme tıklanınca makale sayfasına git
        network.on("click", function (params) {
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                const node = graphData.nodes.get(nodeId);
                if (node.url) window.open(node.url, '_blank');
            }
        });

        // 🌀 Küçük animasyon
        network.once("stabilizationIterationsDone", function () {
            network.fit({ animation: { duration: 800, easingFunction: "easeInOutQuad" } });
        });
    }
});
