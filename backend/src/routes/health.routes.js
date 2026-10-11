import {Router} from "express";
const router=Router();
router.get("/",(req,res)=>res.json({ok:true,service:"acessforge-backend",version:"0.2.0",status:"running"}));
export default router;