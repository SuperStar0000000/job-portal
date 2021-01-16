const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const authKeys = require("../lib/authKeys");

const Job = require("../db/Job");

const router = express.Router();

router.post("/addJob", (req, res, next) => {
  passport.authenticate("jwt", { session: false }, function (err, user, info) {
    if (err) {
      return next(err);
    }
    if (!user) {
      res.status(401).json(info);
      return;
    }

    if (user.type != "recuiter") {
      res.status(401).json({
        message: "You don't have permissions to add jobs",
      });
      return;
    }
    // when user exists
    const data = req.body;
    console.log("Passed");
    let job = new Job({
      userId: user._id,
      title: data.title,
      maxApplicants: data.maxApplicants,
      maxPositions: data.maxPositions,
      dateOfPosting: data.dateOfPosting,
      deadline: data.deadline,
      skillsets: data.skillsets,
      jobType: data.jobType,
      duration: data.duration,
      salary: data.salary,
      rating: data.rating,
    });

    job
      .save()
      .then(() => {
        res.json({ message: "Job added successfully to the database" });
      })
      .catch((err) => {
        res.status(400).json(err);
      });
  })(req, res, next);
});

router.get("/jobs", (req, res, next) => {
  passport.authenticate("jwt", { session: false }, function (err, user, info) {
    if (err) {
      return next(err);
    }
    if (!user) {
      res.status(401).json(info);
      return;
    }

    let findParams = {};
    let sortParams = {};
    // console.log(req.query);
    // console.log(Array.isArray(req.query.q));

    if (req.query.q) {
      findParams = {
        ...findParams,
        title: {
          $regex: new RegExp(req.query.q),
        },
      };
    }

    if (req.query.jobType) {
      findParams = {
        ...findParams,
        jobType: req.query.jobType,
      };
    }

    if (req.query.salaryMin && req.query.salaryMax) {
      findParams = {
        ...findParams,
        $and: [
          {
            salary: {
              $gte: parseInt(req.query.salaryMin),
            },
          },
          {
            salary: {
              $lte: parseInt(req.query.salaryMax),
            },
          },
        ],
      };
    } else if (req.query.salaryMin) {
      findParams = {
        ...findParams,
        salary: {
          $gte: parseInt(req.query.salaryMin),
        },
      };
    } else if (req.query.salaryMax) {
      findParams = {
        ...findParams,
        salary: {
          $lte: parseInt(req.query.salaryMax),
        },
      };
    }

    if (req.query.duration) {
      findParams = {
        ...findParams,
        duration: {
          $lt: parseInt(req.query.duration),
        },
      };
    }

    if (req.query.asc) {
      if (Array.isArray(req.query.asc)) {
        req.query.asc.map((key) => {
          sortParams = {
            ...sortParams,
            [key]: 1,
          };
        });
      } else {
        sortParams = {
          ...sortParams,
          [req.query.asc]: 1,
        };
      }
    }

    if (req.query.desc) {
      if (Array.isArray(req.query.desc)) {
        req.query.desc.map((key) => {
          sortParams = {
            ...sortParams,
            [key]: -1,
          };
        });
      } else {
        sortParams = {
          ...sortParams,
          [req.query.desc]: -1,
        };
      }
    }

    console.log(findParams);
    console.log(sortParams);

    Job.find(findParams)
      .collation({ locale: "en" })
      .sort(sortParams)
      .then((posts) => {
        if (posts == null) {
          res.status(404).json({
            message: "No job found",
          });
          return;
        }
        res.json(posts);
      })
      .catch((err) => {
        res.status(400).json(err);
      });
  })(req, res, next);
});

// to get info about a particular job
router.get("/jobs/:id", (req, res, next) => {
  passport.authenticate("jwt", { session: false }, function (err, user, info) {
    if (err) {
      return next(err);
    }
    if (!user) {
      res.status(401).json(info);
      return;
    }
    Job.findOne({ _id: req.params.id })
      .then((job) => {
        if (job == null) {
          res.status(400).json({
            message: "Job does not exist",
          });
          return;
        }
        console.log(job);
        res.json(job);
      })
      .catch((err) => {
        res.status(400).json(err);
      });
  })(req, res, next);
});

// to update info of a particular job
router.put("/jobs/:id", (req, res, next) => {
  passport.authenticate("jwt", { session: false }, function (err, user, info) {
    if (err) {
      return next(err);
    }
    if (!user) {
      res.status(401).json(info);
      return;
    }
    // if (user.type != "recuiter") {
    //   res.status(401).json({
    //     message: "You don't have permissions to change the job details",
    //   });
    //   return;
    // }
    Job.findOne({
      _id: req.params.id,
      userId: user.id,
    })
      .then((job) => {
        if (job == null) {
          res.status(404).json({
            message: "Job does not exist",
          });
          return;
        }
        const data = req.body;
        if (data.maxApplicants) {
          job.maxApplicants = data.maxApplicants;
        }
        if (data.maxPositions) {
          job.maxPositions = data.maxPositions;
        }
        if (data.deadline) {
          job.deadline = data.deadline;
        }
        job
          .save()
          .then(() => {
            res.json({
              message: "Job details updated successfully",
            });
          })
          .catch((err) => {
            res.status(400).json(err);
          });
      })
      .catch((err) => {
        res.status(400).json(err);
      });
  })(req, res, next);
});

// to delete a job
router.delete("/jobs/:id", (req, res, next) => {
  passport.authenticate("jwt", { session: false }, function (err, user, info) {
    if (err) {
      return next(err);
    }
    if (!user) {
      res.status(401).json(info);
      return;
    }
    if (user.type != "recuiter") {
      res.status(401).json({
        message: "You don't have permissions to delete the job",
      });
      return;
    }
    Job.findOneAndDelete({
      _id: req.params.id,
      userId: user.id,
    })
      .then(() => {
        res.json({
          message: "Job deleted successfully",
        });
      })
      .catch((err) => {
        res.status(400).json(err);
      });
  })(req, res, next);
});

// router.get("/jobs", (req, res, next) => {
//   passport.authenticate("jwt", { session: false }, function (err, user, info) {
//     if (err) {
//       return next(err);
//     }
//     if (!user) {
//       res.status(401).json(info);
//       return;
//     }
//   })(req, res, next);
// });

module.exports = router;
