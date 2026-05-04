export const sampleViteReport = {
  name: 'sample-vite-stats.json',
  data: {
    name: 'bundle',
    children: [
      {
        name: 'assets/index-9f3a1c.js',
        children: [
          {
            name: 'node_modules/react',
            children: [
              { name: 'react.production.min.js', size: 7420, gzipSize: 2948 },
              { name: 'jsx-runtime.js', size: 1120, gzipSize: 564 },
            ],
          },
          {
            name: 'node_modules/react-dom',
            children: [
              { name: 'client.js', size: 126_540, gzipSize: 40_220 },
              { name: 'scheduler.production.min.js', size: 10_280, gzipSize: 4_120 },
            ],
          },
          {
            name: 'node_modules/d3',
            children: [
              { name: 'd3-hierarchy.js', size: 34_800, gzipSize: 11_900 },
              { name: 'd3-scale.js', size: 28_200, gzipSize: 9_800 },
              { name: 'd3-array.js', size: 22_600, gzipSize: 7_400 },
            ],
          },
          {
            name: 'src',
            children: [
              { name: 'App.tsx', size: 18_400, gzipSize: 5_200 },
              { name: 'components/Treemap.tsx', size: 27_800, gzipSize: 8_700 },
              { name: 'components/DropZone.tsx', size: 11_600, gzipSize: 3_900 },
              { name: 'parsers/vite.ts', size: 14_100, gzipSize: 4_300 },
              { name: 'parsers/webpack.ts', size: 10_900, gzipSize: 3_500 },
            ],
          },
        ],
      },
      {
        name: 'assets/vendor-11a4d8.css',
        children: [
          { name: 'tailwind.css', size: 18_900, gzipSize: 4_600 },
          { name: 'fonts.css', size: 4_400, gzipSize: 1_200 },
        ],
      },
    ],
  },
} as const;
