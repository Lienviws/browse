var express = require('express');
var multer = require('multer');
var router = express.Router();

/* GET users listing. */
router.use(multer);
router.post("/uploadFile", function(req, res, next){
    var files = req.files.file;
});

module.exports = router;
