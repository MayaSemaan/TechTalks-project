import { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/app/lib/mongoose";
import User from "@/app/models.ts/user";
import jwt from 'jsonwebtoken';

const JWT_SECRET= process.env.JWT_SECRET as string ;

export default async function handler(
  req:NextApiRequest,
  res:NextApiResponse
){
  if (req.method!=='POST'){
    return 
    res.status(405).json({message:'Method not allowed'});
  }
  try{
    await dbConnect();
    const{name, email,password,role}=req.body;

    //validation
    if(!name||!email||!password||!role){
      return res.status(400).json({message:'All fields are required'});
    }

    //checking if user exists
    const existingUser= await User.findOne({email});
    if(existingUser){
      return res.status(409).json({message:'User already exists with this email'});
    }

    //creating new user
    const user= new User({name,email,password,role});
    await user.save();

    //generating JWT token
    const token= jwt.sign({userId:user.id,role:user.role}, JWT_SECRET,
      {expiresIn:'7d'}
    );
    const userResponse={ id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt:user.createdAt
    };

    res.status(201).json({
      success:true,
      message:'User registered successfully',
      data:{user: userResponse,
        token
      }
    });

  }catch (error:any){
    console.log('Registration error:',error);
  
  if(error.name==='ValidationError'){
    const errors= Object.values(error.errors).map((err:any)=>err.message);
    return res.status(400).json({success:false,
      message:'Validation failed',
      errors
    });
  }
  res.status(500).json({success:false,
    message:'Internal server error'
  });
}}
