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
            // 1️⃣ Önce Semantic Scholar API'sini dene
            const paperData = await fetchFromSemanticScholar(query);
            if (paperData) {
                drawGraph(paperData);
                status.textContent = `"${paperData.title}" (Semantic Scholar) için sonuçlar bulundu.`;
                return;
            }

            // 2️⃣ Olmazsa Crossref'e geç
            const crossrefData = await fetchFromCrossref(query);
            if (crossrefData) {
                drawBasicNode(crossrefData);
                status.textContent = `"${crossrefData.title}" (Crossref) bulundu ancak atıf verisi yok.`;
                return;
            }

            // 3️⃣ Hiçbiri çalışmadıysa
            status.textContent = 'Makale bulunamadı. DOI geçerli ama veritabanlarında yer almıyor olabilir.';
        } catch (error) {
            console.error('Hata:', error);
            status.textContent = `Hata: ${error.message}. Lütfen DOI'yi kontrol edin veya daha sonra tekrar deneyin.`;
        }
    }

    // 🧠 Semantic Scholar API (öncelikli)
    async function fetchFromSemanticScholar(doi) {
        const proxy = "https://corsproxy.io/?";
        const apiUrl = `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(doi)}?fields=title,year,references.title,references.paperId,citations.title,citations.paperId`;
        const fullUrl = proxy + encodeURIComponent(apiUrl);

        const response = await fetch(fullUrl);
        if (!response.ok) return null;

        const data = await response.json();
        if (data.error || !data.title) return null;

        return data;
    }

    // 🧩 Crossref API (yedek plan)
    async function fetchFromCrossref(doi) {
        const proxy = "https://corsproxy.io/?";
        const apiUrl = `https://api.crossref.org/works/${encodeURIComponent(doi)}`;
        const fullUrl = proxy + encodeURIComponent(apiUrl);

        const response = await fetch(fullUrl);
        if (!response.ok) return null;

        const json = await response.json();
        if (!json.message || !json.message.title) return null;

        const msg = json.message;
        return {
            title: msg.title[0],
            year: msg.created ? msg.created['date-parts'][0][0] : 'Yıl yok',
            doi: msg.DOI
        };
    }

    // 🕸️ Semantic Scholar grafiği
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

        const graphData = { nodes: new vis.DataSet(nodes), edges: new vis.DataSet(edges) };
        new vis.Network(networkContainer, graphData, options);
    }

    // 📄 Crossref sadece tek makale gösterimi
    function drawBasicNode(data) {
        const nodes = [{
            id: data.doi,
            label: `[MAKALE]\n${data.title.substring(0, 40)}...`,
            title: `${data.title} (${data.year})`,
            color: '#9C27B0',
            size: 30
        }];
        const graphData = { nodes: new vis.DataSet(nodes), edges: new vis.DataSet([]) };
        new vis.Network(networkContainer, graphData, options);
    }
});
