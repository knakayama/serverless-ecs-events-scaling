const AWS = require('aws-sdk');

class Scaling {
  constructor(event, context, callback, awsConfig = {}) {
    this.event = event;
    this.context = context;
    this.callback = callback;
    this.ecs = new AWS.ECS(awsConfig);
    this.ecsServiceArn = process.env.ECS_SERVICE_ARN;
  }

  describeServices() {
    const params = {
      cluster: this.event.detail.clusterArn,
      services: [
        this.ecsServiceArn,
      ],
    };

    return this.ecs.describeServices(params).promise();
  }

  describeClusters(clusterArn) {
    const params = {
      clusters: [
        clusterArn,
      ],
    };

    return this.ecs.describeClusters(params).promise();
  }

  static isDesiredCountMissMatched(desiredCount, containerInstancesCount) {
    return new Promise((resolve, reject) => {
      if (desiredCount === containerInstancesCount) {
        reject({ statusCode: 601 });
      }
      resolve();
    });
  }

  updateService(newDesiredCount) {
    const params = {
      cluster: this.event.detail.clusterArn,
      service: this.ecsServiceArn,
      desiredCount: parseInt(newDesiredCount, 10),
    };

    return this.ecs.updateService(params).promise();
  }

  scaling() {
    let desiredCount = '';
    let containerInstancesCount = '';

    console.log(this.event);
    this.describeServices()
      .then((data) => {
        console.log(data);
        desiredCount = data.services[0].desiredCount;
        return this.describeClusters(this.event.detail.clusterArn);
      })
      .then((data) => {
        console.log(data);
        containerInstancesCount = data.clusters[0].registeredContainerInstancesCount;
        return Scaling.isDesiredCountMissMatched(desiredCount, containerInstancesCount);
      })
      .then(() => this.updateService(containerInstancesCount))
      .then(() => {
        const response = {
          statusCode: 200,
          message: `${desiredCount} to ${containerInstancesCount}.`,
        };
        console.log(response);
        this.callback(null, response);
      })
      .catch((err) => {
        const response = {
          statusCode: err.statusCode,
          message: JSON.stringify(err),
        };
        console.log(JSON.stringify(err));
        this.callback(response);
      });
  }
}

module.exports = Scaling;
