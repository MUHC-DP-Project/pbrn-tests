const { assert, expect } = require("chai");
const chai = require("chai");
const { exit } = require('process');
require('dotenv').config();
const mongoose = require('mongoose');
let projectBaseUrl = "http://localhost:8080/projects/";
let userBaseUrl = "http://localhost:8081/users/";
let authBaseUrl = "http://localhost:8081/auth/";
const {sample_user} = require("./sample_user");
const {sample_user_connection} = require("./sample_user_connection");
const {sample_project1} = require("./sample_project");
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const godToken =  process.env.GOD_TOKEN;

// Database connector
const clearDB = () => {
    mongoose.connection.db.dropDatabase(() => {});
  }

before(async() => {
    const MONGO_DB_URI = process.env.MONGO_TEST_DB_URI;
    const options = {
      useNewUrlParser: true,
      useCreateIndex: true,
      useFindAndModify: false,
      useUnifiedTopology: true,
    };
    const resp = await mongoose.connect(MONGO_DB_URI, options); 
});

after(async() => {
    mongoose.disconnect();
    mongoose.connection.close();
});

afterEach(async() => {
    await clearDB();
});

describe("User project connection tests", () => {

    it('it connect a user to a project by the correct relationship', async() => {
        //CREATING USER
        return chai.request(authBaseUrl)
        .post("signUp")
        .send(sample_user)
        .then(async (user) => {
            //CREATING PROJECT WITH USER
            return await chai.request(projectBaseUrl)
            .post("")
            .send(sample_project1)
            .set("Authorization", "Bearer " + godToken)
            .then(async (project) => {
                //LINKING USERS TO PROJECT
                return await chai.request(userBaseUrl)
                .put("/connectToProjects/" + project.body._id)
                .send(sample_user_connection)
                .set("Authorization", "Bearer " + godToken)
                .then(async (linkedUserRes) => {
                    return await chai.request(userBaseUrl)
                    .get(user.body._id)
                    .set("Authorization", "Bearer " + godToken)
                    .then((updatedUser) => {
                        console.log(updatedUser.body);
                        expect(updatedUser).to.have.status(200);
                        expect(updatedUser.body.PIListOfProjects).to.have.length(1);
                        expect(updatedUser.body.CoIListOfProjects).to.have.length(1);
                        expect(updatedUser.body.ColListOfProjects).to.have.length(1);
                })
            })
        }).catch( (err) => {
            console.log(err);
            assert.fail();
        })
        })
    });


    it('it should delete the project ID in each involved user', async() => {
        //CREATING USER
        return chai.request(authBaseUrl)
        .post("signUp")
        .send(sample_user)
        .then(async (user) => {
            //CREATING PROJECT WITH USER
            return await chai.request(projectBaseUrl)
            .post("")
            .send(sample_project1)
            .set("Authorization", "Bearer " + godToken)
            .then(async (project) => {
                //LINKING USERS TO PROJECT
                return await chai.request(userBaseUrl)
                .put("/connectToProjects/" + project.body._id)
                .send(sample_user_connection)
                .set("Authorization", "Bearer " + godToken)
                .then(async (linkedUserRes) => {
                    //DELETING PROJECT
                    return await chai.request(projectBaseUrl)
                    .delete(project.body._id.toString())
                    .set("Authorization", "Bearer " + godToken)
                    .then(async (deletionRes) => {  //I THINK THIS IS THE ERROR ITS NOT WAITING
                        //DELETE CONNECTION IN USERS
                        console.log(deletionRes.body)
                        return await chai.request(userBaseUrl)
                        .post("removeProjectConnection")
                        .set("Authorization", "Bearer " + godToken)
                        .send(deletionRes.body)
                        .then(async (connectionDeletionRes) => {
                            //GET UPDATED USER
                            return await chai.request(userBaseUrl)
                            .get(user.body._id)
                            .set("Authorization", "Bearer " + godToken)
                            .then((updatedUser) => {
                                //CHECK FOR DELETION WORKED
                                expect(updatedUser).to.have.status(200);
                                expect(updatedUser.body.PIListOfProjects).to.have.length(0);
                                expect(updatedUser.body.CoIListOfProjects).to.have.length(0);
                                expect(updatedUser.body.ColListOfProjects).to.have.length(0);
                            })
                        })
                    })
                })
            })
        }).catch( (err) => {
            console.log(err);
            assert.fail();
        })
    })
 });