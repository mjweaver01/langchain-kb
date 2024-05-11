FROM node:20

WORKDIR /

COPY . .

RUN yarn

ENV NODE_ENV=production

EXPOSE 80

CMD [ "yarn", "start" ]