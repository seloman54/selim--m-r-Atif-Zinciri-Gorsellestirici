// Sayfa yüklendiğinde çalış
document.addEventListener('DOMContentLoaded', () => {
    
    // HTML'deki elemanları seç
    const searchButton = document.getElementById('searchButton');
    const paperInput = document.getElementById('paperInput');
    const networkContainer = document.getElementById('network');
    const status = document.getElementById('status');

    // Grafiği çizmek için Vis.js seçenekleri
    const options = {
        nodes: {
            shape: 'dot',
            size: 16,
            font: {
                size: 14,
                color: '#333'
            },
            borderWidth: 2
        },
        edges: {
            width: 2,
            arrows: {
                to: { enabled: true, scaleFactor: 0.5 }
            }
        },
        physics: {
            // Grafiğin daha hızlı yerleşmesi için ayarlar
            solver: 'barnesHut',
            barnesHut: {
                gravitationalConstant: -3000
            }
        }
    };

    // "Ara" düğmesine tıklandığında
    searchButton.onclick = () => {
        searchPaper();
    };
    
    // "Enter" tuşuna basıldığında da ara
    paperInput.onkeyup = (event) => {
        if (event.key === 'Enter') {
            searchPaper();
        }
    };


    // Ana arama fonksiyonu
    async function searchPaper() {
        const query = paperInput.value.trim();
        if (query === '') {
            status.textContent = 'Lütfen bir DOI, ID veya makale başlığı girin.';
            return;
        }

        status.textContent = 'Aranıyor... Lütfen bekleyin...';

        try {
            // 1. Semantic Scholar API'sini çağır
            // 'fields=' ile hangi bilgileri istediğimizi belirtiyoruz (başlık, referanslar, atıflar)
// --- HATA DÜZELTMESİ (DOI: ön eki eklendi) ---
        // Sadece DOI kabul ettiğimizi varsayıyoruz ve başına "DOI:" ekliyoruz.
        // encodeURIComponent'i de kaldırdık çünkü DOI'deki / (slash) karakterini bozuyordu.

        const paperId = `DOI:${query}`; 
        const apiUrl = `https://api.semanticscholar.org/v1/paper/${paperId}?fields=title,authors,year,references.title,citations.title`;
            
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                throw new Error('Makale bulunamadı veya API hatası.');
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
        // Ana makaleyi farklı bir renkte ve daha büyük göster
        nodes.push({ 
            id: data.paperId, 
            label: `[ANA MAKALE]\n${data.title.substring(0, 30)}...`, // Etiket çok uzun olmasın
            title: `${data.title} (${data.year})`, // Fare ile üzerine gelince tam başlığı göster
            color: '#f0a30a', // Farklı renk (örn: sarı/turuncu)
            size: 30
        });

        // 1. Kaynakçayı (References) ekle
        // Bunlar, ana makalenin atıf yaptığı eski makalelerdir
        if (data.references) {
            data.references.forEach(ref => {
                if (ref.paperId) { // Sadece ID'si olanları ekle
                    nodes.push({
                        id: ref.paperId,
                        label: ref.title.substring(0, 30) + '...',
                        title: ref.title,
                        color: '#4285F4' // Mavi
                    });
                    // Ok, ana makaleden kaynağa doğrudur (Ana -> Kaynak)
                    edges.push({ from: data.paperId, to: ref.paperId });
                }
            });
        }

        // 2. Atıfları (Citations) ekle
        // Bunlar, ana makaleye atıf yapan yeni makalelerdir
        if (data.citations) {
            data.citations.forEach(cit => {
                if (cit.paperId) {
                    nodes.push({
                        id: cit.paperId,
                        label: cit.title.substring(0, 30) + '...',
                        title: cit.title,
                        color: '#34A853' // Yeşil
                    });
                    // Ok, atıf yapan makaleden ana makaleye doğrudur (Atıf -> Ana)
                    edges.push({ from: cit.paperId, to: data.paperId });
                }
            });
        }
        
        // Düğümleri teke indir (bir makale hem atıf hem kaynakça olabilir)
        // Bu, daha ileri bir adımdır, şimdilik basit tutalım.

        // Vis.js verisini oluştur
        const graphData = {
            nodes: new vis.DataSet(nodes),
            edges: new vis.DataSet(edges)
        };
        
        // Grafiği çiz!
        const network = new vis.Network(networkContainer, graphData, options);
    }
});
