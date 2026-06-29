import path from "path";

const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  webpack: (config) => {
    config.resolve.alias["@"] = path.join(process.cwd(), "");
    return config;
  },
};

export default nextConfig;