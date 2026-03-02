import multer, { File } from 'multer';

const storage = multer.memoryStorage();

const fileFilter = (
  req: any,
  //@ts-ignore
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (
    file.mimetype === 'text/xml' ||
    file.mimetype === 'application/xml' ||
    file.originalname.toLowerCase().endsWith('.xml')
  ) {
    cb(null, true);
  } else {
    cb(new Error('Only XML files are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

export const xmlUploadMiddleware = upload.array('files', 100);
