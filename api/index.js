const express=require('express');
const cors=require('cors');
const User=require('./models/User')
const mongoose=require('mongoose');
const bodyParser = require("body-parser");
const bcrypt=require('bcrypt');
const jwt=require('jsonwebtoken');
const cookieParser=require('cookie-parser');
const multer=require('multer');
const uploadMiddleware = multer({ dest: 'uploads/' })
const fs=require('fs');
const Post=require('./models/Post.js')


const app=express();

app.use(cors({credentials:true,origin:"http://localhost:3000"}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads',express.static(__dirname+'/uploads'));

const salt=bcrypt.genSaltSync(6);
const secret='asdfasdfadsf';

main()
async function main(){
  await  mongoose.connect('mongodb://127.0.0.1:27017/mern-blog',{useNewUrlParser: true});
}

app.post('/register', async (req,res)=>{
 const {username,password}=req.body;
try{
    const userDoc=await User.create({username,
      password:bcrypt.hashSync(password,salt)})
    console.log(userDoc);
    res.json(userDoc);
}

 catch(e){
    // res.sendStatus(400).json(e);
    console.log("error in index.js ",e);
};


})


app.post('/login',async (req,res)=>{
  const {username,password}=req.body;
  
  const userDoc=await User.findOne({username});

  const passOk= bcrypt.compareSync(password,userDoc.password);
  console.log(passOk);
  if(passOk){
      jwt.sign({username,id:userDoc._id},secret,{},(err,token)=>{
        if (err) throw err;
        res.cookie('token',token).json({id:userDoc._id,username});

      });
  }else{
    res.status(400).json('wrong credentials');

  }
  
})

app.get('/profile',(req,res)=>{
  const {token}=req.cookies;
  jwt.verify(token,secret,{},(err,info)=>{
    if (err) throw err;
    res.json(info);
  })

})

app.post('/logout',(req,res)=>{
  res.cookie('token','').json('ok');
})

app.post('/post',uploadMiddleware.single('file'), async (req,res)=>{
  const {originalname,path}=req.file;
  const parts=originalname.split('.');
  const ext=parts[parts.length-1];
  const newPath=path+'.'+ext;
  fs.renameSync(path,newPath);

  const {title,summary,content}=req.body;


  const {token}=req.cookies;
  jwt.verify(token,secret,{}, async (err,info)=>{
    if (err) throw err;
const postDoc=await Post.create({
    title,
    summary,
    content,
    cover:newPath,
    author:info.id
  })
   res.json({postDoc});
  })
})

app.put('/post', uploadMiddleware.single('file'), async(req,res)=>{
  let newPath=null;
  if(req.file){
    const {originalname,path}=req.file;
    const parts=originalname.split('.');
    const ext=parts[parts.length-1];
    newPath=path+'.'+ext;
    fs.renameSync(path,newPath);
  }

  const { token } = req.cookies;
jwt.verify(token, secret, {}, async (err, info) => {
  if (err) throw err;
  const { id, title, summary, content } = req.body;
  const postDoc = await Post.findById(id);
  const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
  if (!isAuthor) {
    return res.status(400).json('you are not the author');
  }

  // Use updateOne method on the model
  await Post.updateOne(
    { _id: id }, // Query to find the document
    {
      $set: {
        title,
        summary,
        content,
        cover: newPath ? newPath : postDoc.cover,
      },
    }
  );

  // Fetch the updated document
  const updatedPost = await Post.findById(id);

  res.json(updatedPost);
});

})

app.get('/post',async (req,res)=>{
  
  res.json(await Post.find()
  .populate('author',['username'])
  .sort({createdAt: -1}
    ));
})

app.get('/post/:id', async (req,res)=>{
  const {id}=req.params;
  const postDoc = await Post.findById(id).populate('author',['username']);
  res.json(postDoc);
})

app.listen(4000,()=>{console.log("successfully connected to port 4000")});