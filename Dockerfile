FROM alpine:edge

# LABEL
LABEL org.opencontainers.image.source="https://github.com/AmirulAndalib/yt-dlp-web-ui"

# folder structure
WORKDIR /usr/src/yt-dlp-webui/downloads
VOLUME /downloads
WORKDIR /usr/src/yt-dlp-webui

# install core dependencies
RUN apk update
RUN apk add curl wget psmisc \
    ffmpeg nodejs npm \
    go yt-dlp

# copy srcs
COPY . .

# install node dependencies
WORKDIR /usr/src/yt-dlp-webui/frontend
RUN npm i && \
    npm run build

# install go dependencies
WORKDIR /usr/src/yt-dlp-webui
RUN go build -o yt-dlp-webui

# expose and run
EXPOSE 3033
CMD [ "./yt-dlp-webui" , "--out", "/downloads" ]
