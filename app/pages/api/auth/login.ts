import { NextApiRequest,NextApiResponse } from "next";
import dbConnect from "@/app/lib/mongoose";
import User from  "@/app/models.ts/user";
import jwt from 'jsonwebtoken';

const JWT_SECRET= process.env.JWT_SECRET as string;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
){
  if(req.method !=='POST'){
    return res.status(405).json({message:'Method not allowed'});
  }
  try{
    await dbConnect();

    const {email,password}=req.body;

    if(!email || !password){
      return res.status(400).json({message:'Email and password are required'});
    }
    const user = await User.findOne({email});
    if(!user){
      return res.status(401).json({message:'Invalid credential'});
    }

    const isPasswordValid= await user.comparePassword(password);
    if(!isPasswordValid){
      res.status(401).json({message:'Invalid credential'});
    }

    const token = jwt.sign({userId:user._id, role:user.role},
      JWT_SECRET,
      {expiresIn:'7d'}
    );

    const userResponse={
      id: user._id,
      name:user.name,
      email:user.email,
      role:user.role,
      createdAt: user.createdAt
    };

    res.status(200).json({
      success:true,
      message:'Login successful',
      data:{
        user: userResponse,
        token
      }
    });

  }catch(error:any){
    console.error('Login error:',error);
    res.status(500).json({
      success:false,
      message:'Internal server error'
    });
  }
}

