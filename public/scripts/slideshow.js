import Swiper from 'swiper/bundle';
import 'swiper/css/bundle';

let matthewSwiper = null;

async function loadMatthewSlideshow() {
    try {
        console.log('🌀 Loading Matthew slideshow...');

        // Prevent cached API response
        const response = await fetch(`/api/photos/matthew?ts=${Date.now()}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const photos = await response.json();

        if (!Array.isArray(photos) || photos.length === 0) {
            throw new Error('No photos received');
        }

        // Debug log
        console.log(`📸 Loaded ${photos.length} photos`);
        console.log('🔍 Sample photos:', photos.slice(0, 3)); // first 3 for inspection

        const wrapper = document.getElementById('slideshow-wrapper');
        if (!wrapper) {
            throw new Error('Slideshow wrapper not found');
        }

        wrapper.innerHTML = '';

        photos.forEach((photo, index) => {
            const slide = document.createElement('div');
            slide.className = 'swiper-slide';
            slide.innerHTML = `
                <div class="relative h-96 sm:h-[500px] lg:h-[600px] bg-gray-900">
                    <img
                        src="${photo.baseUrl}=w1200"
                        alt="AI portrait ${index + 1}"
                        class="w-full h-full object-contain"
                        loading="lazy"
                    />
                </div>
            `;
            wrapper.appendChild(slide);
        });

        matthewSwiper = new Swiper('#matthew-slideshow', {
            loop: photos.length > 1,
            slidesPerView: 1,
            spaceBetween: 0,
            speed: 800,
            autoplay: {
                delay: 5000,
                disableOnInteraction: false,
                pauseOnMouseEnter: true,
            },
            effect: 'fade',
            fadeEffect: {
                crossFade: true
            },
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
                dynamicBullets: true,
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
            },
            keyboard: {
                enabled: true,
                onlyInViewport: true,
            },
            on: {
                slideChange: function () {
                    updateCounter(this.realIndex + 1, photos.length);
                }
            }
        });

        updateCounter(1, photos.length);
        console.log('✅ Slideshow initialized');

    } catch (error) {
        console.error('❌ Slideshow error:', error);

        const wrapper = document.getElementById('slideshow-wrapper');
        if (wrapper) {
            wrapper.innerHTML = `
                <div class="swiper-slide flex items-center justify-center h-96 bg-gray-800 text-white text-center">
                    <div>
                        <p class="text-lg mb-2">Unable to load AI art</p>
                        <p class="text-sm text-gray-400">Please refresh the page</p>
                    </div>
                </div>
            `;
        }
    }
}

function updateCounter(current, total) {
    const counter = document.getElementById('photo-counter');
    if (counter) {
        counter.textContent = `${current} of ${total} AI artworks`;
        counter.style.opacity = '1';
    }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadMatthewSlideshow);
} else {
    loadMatthewSlideshow();
}

// Cleanup
window.addEventListener('beforeunload', () => {
    if (matthewSwiper) {
        matthewSwiper.destroy();
    }
});