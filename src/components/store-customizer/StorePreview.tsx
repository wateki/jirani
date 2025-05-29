import type { StorePreviewProps } from "./types";
import { getButtonStyles } from "./utils";

export const StorePreview = ({
  heroHeading,
  heroSubheading,
  buttonStyle,
  primaryColor,
  secondaryColor,
  coverImage,
  logoImage,
  storeName,
}: StorePreviewProps) => {
  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      {/* Mock Store Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center">
          {logoImage ? (
            <img src={logoImage} alt="Store Logo" className="mr-2 h-8 w-8 object-contain" />
          ) : (
            <div className="mr-2 flex h-8 w-8 items-center justify-center rounded bg-gray-200 text-xs">
              {storeName.substring(0, 2) || "Ji"}
            </div>
          )}
          <span className="font-medium text-gray-800">{storeName || "Ji"}</span>
        </div>
        <div className="flex items-center space-x-6">
          <span className="text-sm">Shop Now</span>
          <span className="text-sm">Collections</span>
          <div className="relative">
            <input
              type="text"
              placeholder="Search For Product"
              className="w-40 rounded-full border bg-gray-100 px-4 py-1 text-sm"
            />
          </div>
          <div className="relative">
            <span className="relative rounded-full bg-gray-100 p-2">
              🛒
              <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                0
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div
        className="flex items-center justify-between px-8 py-12"
        style={{
          backgroundColor: coverImage ? "transparent" : "#ffffff",
          backgroundImage: coverImage ? `url(${coverImage})` : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
          minHeight: "400px",
        }}
      >
        <div className="max-w-lg">
          <h1 className="mb-6 text-4xl font-bold leading-tight" style={{ color: primaryColor }}>
            {heroHeading || "FIND CLOTHES THAT MATCHES YOUR STYLE"}
          </h1>
          <p className="mb-8 text-sm text-gray-700">
            {heroSubheading ||
              "Browse through our diverse range of meticulously crafted garments, designed to bring out your individuality and cater to your sense of style."}
          </p>
          <button className={`px-6 py-3 ${getButtonStyles(buttonStyle, primaryColor)}`}>
            shop-now
          </button>
        </div>
        <div>
          <img src="/placeholder-image.jpg" alt="Hero" className="hidden max-w-xs md:block" />
        </div>
      </div>

      {/* Collections Section */}
      <div className="bg-gray-50 px-8 py-16">
        <h2 className="mb-12 text-center text-3xl font-bold" style={{ color: primaryColor }}>
          BROWSE BY COLLECTIONS
        </h2>

        <div className="flex justify-center">
          <div className="rounded-lg bg-white p-8 text-center shadow-sm">
            <div className="mb-4 flex justify-center">
              <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-red-100">
                <div className="h-16 w-20 rotate-12 transform rounded-lg bg-red-300"></div>
                <div className="absolute -top-2 left-10 h-2 w-2 rounded-full bg-red-200"></div>
                <div className="absolute -right-2 top-6 h-3 w-3 rounded-full bg-red-200"></div>
                <div className="absolute bottom-4 right-2 h-4 w-4 rounded-full bg-red-200"></div>
              </div>
            </div>
            <p className="mb-2 text-gray-500">No collection available</p>
          </div>
        </div>
      </div>

      {/* Newsletter Section */}
      <div className="px-8 py-12" style={{ backgroundColor: primaryColor }}>
        <div className="flex flex-col items-center justify-between md:flex-row">
          <div className="mb-6 md:mb-0">
            <h2 className="mb-2 text-2xl font-bold text-white">
              STAY UP TO DATE ABOUT OUR LATEST OFFERS
            </h2>
          </div>
          <div className="flex items-center">
            <input
              type="email"
              placeholder="Enter Email"
              className="rounded-l-md border-0 px-4 py-2"
            />
            <button className="rounded-r-md bg-white px-6 py-2 font-medium text-gray-800">
              subscribe
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t p-6 text-center">
        <div className="mb-4 flex justify-center space-x-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white">
            f
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white">
            i
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white">
            t
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Like this site? Build yours in 5 mins with Fingertipps.
        </p>
      </div>
    </div>
  );
};
