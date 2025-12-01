/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Alias mapbox-gl to maplibre-gl
    config.resolve.alias = {
      ...config.resolve.alias,
      'mapbox-gl': 'maplibre-gl',
    };
    return config;
  },
}

module.exports = nextConfig
