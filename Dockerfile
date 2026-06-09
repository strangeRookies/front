FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_BACKEND_BASE_URL=http://localhost:8080
ARG VITE_STREAM_BASE_URL=http://localhost:18000
ARG VITE_CAMERA_1_STREAM_URL=http://localhost:8010/stream
ARG VITE_CAMERA_2_STREAM_URL=http://localhost:8011/stream
ARG VITE_CAMERA_3_STREAM_URL=http://localhost:8012/stream
ARG VITE_CAMERA_4_STREAM_URL=http://localhost:8013/stream

ENV VITE_BACKEND_BASE_URL=${VITE_BACKEND_BASE_URL}
ENV VITE_STREAM_BASE_URL=${VITE_STREAM_BASE_URL}
ENV VITE_CAMERA_1_STREAM_URL=${VITE_CAMERA_1_STREAM_URL}
ENV VITE_CAMERA_2_STREAM_URL=${VITE_CAMERA_2_STREAM_URL}
ENV VITE_CAMERA_3_STREAM_URL=${VITE_CAMERA_3_STREAM_URL}
ENV VITE_CAMERA_4_STREAM_URL=${VITE_CAMERA_4_STREAM_URL}

RUN npm run build

FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

