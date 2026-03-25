import createMDX from "@next/mdx";

/** @type {import("next").NextConfig} */
const nextConfig = {
  output: "standalone",
  basePath: "/docs",
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  async redirects() {
    return [
      {
        source: "/",
        destination: "/docs",
        permanent: false,
        basePath: false,
      },
    ];
  },
};

const withMDX = createMDX();

export default withMDX(nextConfig);
