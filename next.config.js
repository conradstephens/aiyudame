/** @type {import('next').NextConfig} */

const million = require("million/compiler");

const nextConfig = {
  output: "standalone"
};

const millionConfig = {
  auto: { rsc: true }
}

module.exports = million.next(nextConfig, millionConfig);
