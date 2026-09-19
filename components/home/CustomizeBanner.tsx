import Link from "next/link";
import { bannerUnit, RotatedShoe, u } from "./banner";

// Exact gradient from Figma (1:409).
const customizeGradient =
  "linear-gradient(89.385deg, rgb(255,61,0) 2.1293%, rgb(255,193,7) 5.4148%, rgb(255,139,184) 9.4796%, rgb(76,175,80) 13.24%, rgb(148,161,122) 20.241%, rgb(253,186,98) 24.769%, rgb(255,139,184) 29.298%, rgb(75,129,244) 32.179%, rgb(253,186,98) 35.472%, rgb(255,61,0) 41.07%)";

/**
 * Second Home banner (Figma "Frame 234", 1:1793), 390×200. Figma draws
 * pagination dots but has only this one slide, so the dots are decorative.
 */
export function CustomizeBanner() {
  return (
    <section aria-label="Customize your favorites" className="@container">
      <div className="relative aspect-[390/200] overflow-hidden" style={bannerUnit(390)}>
        <div
          className="absolute inset-0 border border-border bg-surface"
          style={{ borderRadius: u(19) }}
        />
        <p
          className="absolute font-banner text-black"
          style={{ left: u(27), top: u(22), fontSize: u(26), lineHeight: u(31) }}
        >
          Unlock{" "}
          <span className="text-[#ee6c43]" style={{ fontSize: u(28) }}>
            20% Off
          </span>
          <br />
          on All Brands
        </p>
        <p
          className="absolute font-semibold whitespace-nowrap text-black"
          style={{ left: u(27), top: u(94), fontSize: u(17) }}
        >
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: customizeGradient, fontSize: u(19) }}
          >
            Customize
          </span>{" "}
          Your Favorites!
        </p>
        <Link
          href="/customise"
          className="absolute flex items-center justify-center rounded-full bg-black font-semibold whitespace-nowrap text-white"
          style={{ left: u(45), top: u(128), width: u(120), height: u(37), fontSize: u(19) }}
        >
          Shop Now
        </Link>
        <div aria-hidden className="absolute flex" style={{ left: u(172), top: u(181), gap: u(10) }}>
          {["bg-black", "bg-border", "bg-border"].map((color, index) => (
            <span
              key={index}
              className={`rounded-full ${color}`}
              style={{ width: u(9), height: u(9) }}
            />
          ))}
        </div>
        <RotatedShoe
          src="/images/banners/blue-shoe.png"
          frame={[202.3, 35.4, 181.7, 142.2]}
          size={[160.1, 88.7]}
          rotate={-22}
          shadow={[20, 40, 0.3]}
          doubled
        />
      </div>
    </section>
  );
}
