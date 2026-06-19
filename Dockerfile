FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_BACKEND_BASE_URL=http://localhost:8080
ARG VITE_STREAM_MODE=webrtc
ARG VITE_HLS_BASE_URL=http://localhost:8888
ARG VITE_WEBRTC_BASE_URL=http://localhost:8889
ARG VITE_STREAM_FALLBACK_ENABLED=true
ARG VITE_OVERLAY_BASE_URL=http://localhost:8010

ENV VITE_BACKEND_BASE_URL=${VITE_BACKEND_BASE_URL}
ENV VITE_STREAM_MODE=${VITE_STREAM_MODE}
ENV VITE_HLS_BASE_URL=${VITE_HLS_BASE_URL}
ENV VITE_WEBRTC_BASE_URL=${VITE_WEBRTC_BASE_URL}
ENV VITE_STREAM_FALLBACK_ENABLED=${VITE_STREAM_FALLBACK_ENABLED}
ENV VITE_OVERLAY_BASE_URL=${VITE_OVERLAY_BASE_URL}

RUN npm run build

FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

