import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Length } from "class-validator";

export class CreateAuthDto {

    @ApiProperty({
        description: 'The username of the user',
        type: String,
    })
    @IsString()
    @IsNotEmpty()
    username: string;

    @ApiProperty({
        description: 'The password of the user, min length 8',
        type: String,
    })
    @IsString()
    @Length(8)
    @IsNotEmpty()
    password: string;

    @ApiProperty({
        description: "Full name of the user",
        type: String
    })
    @IsNotEmpty()
    fullName: string;
}