import { Outlet } from "react-router-dom";

const AuthLayout = () => {
  const images = [
    "/img1.webp",
    "/img2.webp",
    "/img3.webp",
    "/img4.webp",
    "/img5.webp",
    "/img6.webp",
    "/img7.webp",
    "/img8.webp",
  ];

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4">
      {/* Background gradient (sits behind the grid) */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-dark to-primary" />

      {/* Image Grid */}
      <div className="absolute inset-0 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
        {images.map((src, i) => (
          <div key={i} className="relative w-full h-full">
            <img
              src={src}
              alt={`bg-${i}`}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>
        ))}
      </div>

      {/* Dim overlay */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Auth card (matches your compact layout) */}
      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          <div className="p-6">
            <div className="text-center">
              <img
                className="w-full h-10 object-contain"
                src="/homiqly-logo.png"
                alt="logo"
              />
            </div>

            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
