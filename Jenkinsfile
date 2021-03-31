#!/usr/bin/env groovy
pipeline {
  agent any
  tools {
      nodejs 'LTS10'
  }
  stages {
    stage('Clear workspace') {
      steps {
        slackSend color: 'good', message: 'Home - Start master build'
        deleteDir()
      }
    }
    stage('Checkout') {
      steps {
        checkout scm
      }
    }
    stage('Setup') {
      steps {
        sh 'yarn install --frozen-lockfile'
      }
    }
    stage('Build') {
      steps {
        sh 'gulp build'
      }
    }
    stage('Publish artifact') {
      environment {
        AWS_ACCESS_KEY_ID = 'AKIAJNVORWJZAPFKY5MA'
        AWS_SECRET_ACCESS_KEY = '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'
        AWS_BUCKET_NAME = 'jic-artifacts'
        REGION = 'us-east-1'
      }
      steps {
        sh 'chmod +x build/publish-artifact.sh'
        sh 'build/publish-artifact.sh'
      }
    }
  }
  post {
    success {
      slackSend color: 'good', message: 'Home - Master build complete'
    }
    failure {
      slackSend color: 'bad', message: 'Home - Master build failed'
    }
  }
}
