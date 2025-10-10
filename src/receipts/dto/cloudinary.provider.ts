import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

export const CloudinaryProvider = {
    provide: 'Cloudinary',
    useFactory: (configService: ConfigService) => {
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });
        return cloudinary;
    },
    inject: [ConfigService],
};
export default cloudinary;