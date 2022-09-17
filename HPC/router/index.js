const express = require('express');
const app = express();
const router = express.Router();

// or 8180 for testing outside of docker container
const PORT = process.env.PORT || 8180;

const path = __dirname

router.use(function (req,res,next) {
  console.log('/' + req.method);
  next();
});

router.get('/', function(req,res){
  res.sendFile(path + 'index.html');
});

app.use(express.static(path));
app.use('/', router);

app.listen(PORT, function () {
  console.log(`Listening on port ${PORT}`)
})