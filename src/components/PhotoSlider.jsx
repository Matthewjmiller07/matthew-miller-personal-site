import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import { Autoplay, Navigation } from "swiper/modules";

const PhotoSlider = ({ photos }) => {
  return (
    <Swiper
      slidesPerView={1}
      speed={1000}
      loop={true}
      autoplay={{
        delay: 4000,
        disableOnInteraction: false,
      }}
      navigation={true}
      modules={[Autoplay, Navigation]}
      className="photo-slider"
      style={{
        "--swiper-navigation-color": "#fff",
        "--swiper-navigation-size": "30px",
      }}
    >
      <style>{`
        .photo-slider {
          width: 100%;
          height: 250px;
        }
        .photo-slider .swiper-slide {
          display: flex;
          align-items: center;
          justify-content: center;
          background: #1a1a1a;
        }
        .photo-slider .swiper-slide img {
          max-width: 100%;
          max-height: 100%;
          width: auto;
          height: auto;
          object-fit: contain;
        }
        .photo-slider .swiper-button-next,
        .photo-slider .swiper-button-prev {
          background: rgba(0, 0, 0, 0.5);
          width: 35px;
          height: 35px;
          border-radius: 50%;
          backdrop-filter: blur(3px);
        }
        .photo-slider .swiper-button-next:hover,
        .photo-slider .swiper-button-prev:hover {
          background: rgba(0, 0, 0, 0.7);
        }
      `}</style>
      {photos.map((photo, index) => (
        <SwiperSlide key={photo.id || index}>
          <img
            src={`${photo.baseUrl}=w800`}
            alt="AI Generated Portrait"
            loading="lazy"
          />
        </SwiperSlide>
      ))}
    </Swiper>
  );
};

export default PhotoSlider;
