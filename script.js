document.addEventListener('DOMContentLoaded', function() {
    const galleryContainer = document.getElementById('gallery-container');

    // Lista de URLs das imagens
    const imageUrls = [
        'imagem1.jpg',
        'imagem2.jpg',
        'imagem3.jpg',
        // Adicione mais URLs conforme necessário oooooooo
    ];

    // Adiciona as imagens dinamicamente
    imageUrls.forEach((url, index) => {
        const galleryItem = document.createElement('div');
        galleryItem.classList.add('gallery-item');

        const image = document.createElement('img');
        image.src = url;
        image.alt = `Imagem ${index + 1}`;

        galleryItem.appendChild(image);
        galleryContainer.appendChild(galleryItem);
    });
});
