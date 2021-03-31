#!/bin/sh
set -e

if [ -z $AWS_ACCESS_KEY_ID ]; then
  echo "AWS_ACCESS_KEY_ID not defined" >&2
  exit 1
fi

if [ -z $AWS_SECRET_ACCESS_KEY ]; then
  echo "AWS_SECRET_ACCESS_KEY not defined" >&2
  exit 1
fi

if [ -z $AWS_BUCKET_NAME ]; then
  echo "AWS_BUCKET_NAME not defined" >&2
  exit 1
fi

if [ -z $REGION ]; then
  echo "REGION not defined" >&2
  exit 1
fi

if [ ! -d "./jic-homepage" ]; then
  mkdir jic-homepage
fi

rsync -av --progress . jic-homepage \
  --exclude jic-homepage \
  --exclude node_modules \
  --exclude src \
  --exclude .git

cd jic-homepage
yarn --frozen-lockfile --production
cd ..
tar -zcvf "jic-homepage.tar.gz" jic-homepage
rm -rf jic-homepage

# upload to s3
virtualenv env
. env/bin/activate
pip install boto gevent

python build/lib/upload_to_s3.py --bucket ${AWS_BUCKET_NAME} --region ${REGION}  "jic-homepage.tar.gz" "jic-homepage.tar.gz"
