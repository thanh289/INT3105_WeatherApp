import chai from "chai";
import chaiHttp from "chai-http";
import app from "../app";
import { describe } from "mocha";

const should = chai.should();
chai.use(chaiHttp);

/**
 *  CHECK WRONG ROUTE
 */
describe("WEATHER REST API - Integration tests", () => {
  describe("GET /random-url", () => {
    it("it should return 404", (done) => {
      chai
        .request(app)
        .get("/api/v1/vopak/reset")
        .end((err, res) => {
          res.should.have.status(404);
          done();
        });
    });
  });

  /**
   *  GET ALL
   */

  describe("GET /api/v1/vopak", () => {
    it("it should GET all the tempratures from the db", (done) => {
      chai
        .request(app)
        .get("/api/v1/vopak")
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a("object");
          done();
        });
    });
  });


  /**
   *  GET A SPECIFIC CITY
   */
  describe("GET /api/v1/vopak/weathers", () => {
    const city: string = "Rotterdam";
    it("it should GET temprature of Rotterdam", (done) => {
      chai
        .request(app)
        .get(`/api/v1/vopak/weathers?city=${city}`)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a("object");
          done();
        });
    });
  });

  /**
   * GET THE AVERAGE TEMPRATURE OF A SPECIFIC CITY
   */
  describe("GET /api/v1/vopak/weathers", () => {
    const city: string = "Rotterdam";
    const year: number = 2021;
    const month: number = 9;

    it("it should GET average temprature of Dhaka for a given month of the year", (done) => {
      chai
        .request(app)
        .get(`/api/v1/vopak/weathers/${city}/${month}/${year}`)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a("object");
          done();
        });
    });
  });
});
