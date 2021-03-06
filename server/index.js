var fs = require('fs'),
		bodyParser = require('body-parser'),
		express = require('express'),
		path = require('path'),
		app = express(),
		mongoose = require('mongoose'),
		votes = require('./models/votes.js'),
		config = require('./config.js'),
		User = require('./models/user.js'),
		bodyParser = require('body-parser'),
		session = require('client-sessions');

app.set('port', (process.env.PORT || 3000));


// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

app.use(session({
  cookieName: 'session',
  secret: 'flklf;k43f;l43k21s12j112e21',
  duration: 30*60*1000,
  activeDuration: 5 * 60 * 1000,
}));

mongoose.connect("mongodb://"+config.database+":27017/", function (err, res) {
  if (err) {
  console.log ('ERROR connecting to db' + err);
  } else {
  console.log ('Succeeded connected to db');
}});

app.use('/', express.static(path.join(__dirname,'../pub')));

app.use(function(req,res,next){
  if(req.session && req.session.user){
    User.model.findOne({ _id: req.session.user._id }, function(err,user){
      if(user){
        req.user = user;
        delete req.user.password;
        req.session.user = user;
        res.locals.user = user;
      }
      next();
    });
  }else{
    next();
  }
});

app.get('/getlogged', function(req, res, next){
  if(!req.user){
    return  res.send("no");
  }
  return res.send(req.user);
});

app.post('/login', function(req,res,next){
  User.model.findOne({email:req.body.email}, function(err, user){
    if(err){
    	return res.send('no')
    }else{
      if(!user){
      	return res.send('no');
      }else{
        var p = require('crypto').createHash('md5').update(req.body.password).digest('hex');
        if(p==user.password){
          req.session.user = user;
        }else{
          return res.send('no');
        }
      }
    } 
    return res.send(req.session.user);
  });
});

app.get('/logout', function(req,res){
console.log('logged out')
  req.session.reset();
  res.send('oh');
});

app.get('/createvoter/:id/:num', function(req, res, next){
  var tempArr = [];
  for(var i = 0; i < req.params.num; i++){
  	tempArr.push(0)
  }
  var temp = new votes.model({ 
  	  questionid: req.params.id,
	  poll:tempArr
  });
  temp.save(function(err,data){
    if(err) res.send("saved: failed");
    res.redirect('/showvoter/'+req.params.id);
  });
});

app.get('/showvoters', function(req, res, next){
   votes.model.find({},function(err,users){
    var userMap = {};
    users.forEach(function(user){
      userMap[user._id] = user;
    });
    res.send(userMap);
  });
});

app.get('/incrementvoter/:id/:answer', function(req, res, next){
  if(!req.session.user) return res.send('no');

  votes.model.findOne({questionid:req.params.id}, function(err, user){
  	var temppoll = user.poll;
  	var tempvotes = user.votes;
 
  	votes.model.find({_id:user._id}).remove(function(err){
  		
  	});
  	var savei;
	  var temp = new votes.model({ 
	  	  questionid: req.params.id,
		  poll:temppoll,
		  votes: tempvotes
	  });
	  var notvoted = false;
	  for(var i = 0; i < tempvotes.length; i++){
	  	if(tempvotes[i].userid == req.session.user._id){
	  		notvoted = true;
	  		savei = i;
	  	}
	  }

	  var alreadys = false;

	  if(!notvoted){
	  	temp.votes.push({
	  		userid: req.session.user._id,
	  		vote: req.params.answer
	  	})
    	temp.poll[req.params.answer] = temp.poll[req.params.answer] + 1;
	  }else{
	  	if(req.params.answer == temp.votes[savei].vote){
	  		alreadys = true;
	  	}else{
	  		temp.poll[req.params.answer] = temp.poll[req.params.answer] + 1;
	  		temp.poll[temp.votes[savei].vote] = temp.poll[temp.votes[savei].vote] - 1;
	  		temp.votes[savei].vote = req.params.answer;
	  	}
	  }

	  temp.save(function(err){
	    if(err) return res.send("saved: failed");
	    if(alreadys) return res.send('alreadyvoted');
	    if(!notvoted) return res.send('lag');
	    return res.send('changed');
	  });
	 
   });
});

app.get('/showvoter/:id', function(req,res,next){
  votes.model.findOne({questionid:req.params.id}, function(err, user){
    if(err) res.send("failed");
    else res.send(user);
  });
})

app.get('/vote/:id/:answer', function(req, res, next){
	
});

app.get('/resetvoters', function( req, res, next){
	votes.model.find({},function(err, users){
		users.forEach(function(user){
			user.votes = [];
			user.poll = [0,0,0,0,0,0,0];
			user.save();
		})
		res.send({status:200, data:users, message:"saved"});
	});
});

//**app.get('/deletevoters', function(req, res, next){
	//**votes.model.remove().exec();
	//**res.send('deleted')
//**});

//**app.get('/delete/:id', function(req,res,next){
  //**votes.model.findOne({_id:req.params.id}).remove(function(err){
    //**if(err) res.send("failed");
    //**else res.send("removed: "+req.params.id);
  //**});
//**});

app.post('/users', function(req, res, next){
	var encryptedPasswordInput = require('crypto').createHash('md5').update(req.body.password).digest('hex');
	var tempUser = new User.model({
		email: req.body.email,
		password: encryptedPasswordInput
	});
	tempUser.save(function(err, data){
		if(err) res.send({status:400, data:null, message:err});
		else res.send(req.body.password);
	}); 
});

app.get('/users', function(req,res,next){
	User.model.find({},function(err, users){
		var userMap = {};
		users.forEach(function(user){
			userMap[user._id] = user;
		})
		if(err) res.send({status:400, data:null, message:err});
		else res.send({status:200, data:userMap, message:"Fetching Users"});
	});
});


//**app.delete('/users', function(req, res, next){
	//**User.model.remove().exec();
	//**res.send({status:200, data:null, message:"Deleted "+User});
//**})

//deletes a user
//urlparams: DELETE:/api/v0.1/users/PHONENUMBER
//**function deleteUser(req, res){
	//**User.model.findOne({_id:req.params.phone}).remove(function(err){
		//**if(err) res.send({status:400, data:null, message:err});
		//**else res.send({status:200, data:null, message:req.params.phone+" Removed"});
	//**});
//**}
//deletes all users
//urlparams: DELETE:/api/v0.1/users/

//crud user

app.listen(app.get('port'),function(){
	console.log('server started: http://localhost:' + app.get('port') + '/');
});
