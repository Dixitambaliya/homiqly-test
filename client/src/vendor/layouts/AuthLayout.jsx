import { Outlet } from "react-router-dom";

const AuthLayout = () => {
  // Add your images here
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
    <div className="relative min-h-screen flex items-center justify-center">
      {/* Background Grid */}
      <div className="absolute inset-0 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {images.map((src, i) => (
          <div key={i} className="relative w-full h-full">
            <img
              src={src}
              alt={`bg-${i}`}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>

      {/* Overlay to dim images a little */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Auth card */}
      <div className="relative w-full  overflow-hidden">
        <div className="p-6">
          {/* <div className="text-center">
            <img
              className="w-full h-10 object-contain"
              src="/homiqly-logo.png"
              alt="logo"
            />
          </div> */}
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
