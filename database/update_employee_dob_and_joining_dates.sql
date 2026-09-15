-- Update Employee DOB, Joining Date, and Probation End Date
-- Generated on: 2026-09-16
-- Total records: 71

START TRANSACTION;

-- Manu K O (DOB: 1990-06-05, DOJ: 2019-06-15)
UPDATE users 
SET dob = '1990-06-05', 
    joining_date = '2019-06-15', 
    probation_end_date = '2019-12-15',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'manuko'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Manu K O')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'manuko%';

-- Vishal Ramesh (DOB: 1994-06-28, DOJ: 2019-06-15)
UPDATE users 
SET dob = '1994-06-28', 
    joining_date = '2019-06-15', 
    probation_end_date = '2019-12-15',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'vishalramesh'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Vishal Ramesh')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'vishalramesh%';

-- Bindhu Shenoy (DOB: 1985-12-17, DOJ: 2019-10-18)
UPDATE users 
SET dob = '1985-12-17', 
    joining_date = '2019-10-18', 
    probation_end_date = '2020-04-18',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'bindhushenoy'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Bindhu Shenoy')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'bindhushenoy%';

-- Josin Joseph (DOB: 1998-04-20, DOJ: 2019-10-18)
UPDATE users 
SET dob = '1998-04-20', 
    joining_date = '2019-10-18', 
    probation_end_date = '2020-04-18',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'josinjoseph'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Josin Joseph')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'josinjoseph%';

-- Soumya S Kumar (DOB: 1997-10-22, DOJ: 2020-01-22)
UPDATE users 
SET dob = '1997-10-22', 
    joining_date = '2020-01-22', 
    probation_end_date = '2020-07-22',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'soumyaskumar'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Soumya S Kumar')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'soumyaskumar%';

-- Vishnu Sasidharan (DOB: 1990-05-15, DOJ: 2020-02-10)
UPDATE users 
SET dob = '1990-05-15', 
    joining_date = '2020-02-10', 
    probation_end_date = '2020-08-10',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'vishnusasidharan'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Vishnu Sasidharan')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'vishnusasidharan%';

-- Gokul Shaji (DOB: 1996-12-18, DOJ: 2020-02-24)
UPDATE users 
SET dob = '1996-12-18', 
    joining_date = '2020-02-24', 
    probation_end_date = '2020-08-24',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'gokulshaji'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Gokul Shaji')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'gokulshaji%';

-- Jissa Joseph (DOB: 1985-12-25, DOJ: 2020-06-26)
UPDATE users 
SET dob = '1985-12-25', 
    joining_date = '2020-06-26', 
    probation_end_date = '2020-12-26',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'jissajoseph'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Jissa Joseph')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'jissajoseph%';

-- Romine George (DOB: 1993-09-27, DOJ: 2020-09-01)
UPDATE users 
SET dob = '1993-09-27', 
    joining_date = '2020-09-01', 
    probation_end_date = '2021-03-01',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'rominegeorge'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Romine George')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'rominegeorge%';

-- Akhila Mohanan (DOB: 1995-08-18, DOJ: 2020-07-20)
UPDATE users 
SET dob = '1995-08-18', 
    joining_date = '2020-07-20', 
    probation_end_date = '2021-01-20',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'akhilamohanan'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Akhila Mohanan')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'akhilamohanan%';

-- Ashmi Mathew (DOB: 1994-12-16, DOJ: 2020-10-01)
UPDATE users 
SET dob = '1994-12-16', 
    joining_date = '2020-10-01', 
    probation_end_date = '2021-04-01',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'ashmimathew'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Ashmi Mathew')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'ashmimathew%';

-- Sunil Anurudhan (DOB: 1987-08-24, DOJ: 2021-03-22)
UPDATE users 
SET dob = '1987-08-24', 
    joining_date = '2021-03-22', 
    probation_end_date = '2021-09-22',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'sunilanurudhan'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Sunil Anurudhan')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'sunilanurudhan%';

-- Sahad Rahman (DOB: 1991-01-19, DOJ: 2021-01-01)
UPDATE users 
SET dob = '1991-01-19', 
    joining_date = '2021-01-01', 
    probation_end_date = '2021-07-01',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'sahadrahman'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Sahad Rahman')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'sahadrahman%';

-- Nobby Pachat (DOB: 1990-05-12, DOJ: 2021-09-01)
UPDATE users 
SET dob = '1990-05-12', 
    joining_date = '2021-09-01', 
    probation_end_date = '2022-03-01',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'nobbypachat'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Nobby Pachat')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'nobbypachat%';

-- Mercy Nelson (DOB: 1964-08-29, DOJ: 2021-09-15)
UPDATE users 
SET dob = '1964-08-29', 
    joining_date = '2021-09-15', 
    probation_end_date = '2022-03-15',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'mercynelson'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Mercy Nelson')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'mercynelson%';

-- Abeesh Unnikrishnan K (DOB: 1997-12-24, DOJ: 2021-10-28)
UPDATE users 
SET dob = '1997-12-24', 
    joining_date = '2021-10-28', 
    probation_end_date = '2022-04-28',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'abeeshunnikrishnank'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Abeesh Unnikrishnan K')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'abeeshunnikrishnank%';

-- Ann Mary Elias (DOB: 1995-03-13, DOJ: 2022-04-25)
UPDATE users 
SET dob = '1995-03-13', 
    joining_date = '2022-04-25', 
    probation_end_date = '2022-10-25',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'annmaryelias'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Ann Mary Elias')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'annmaryelias%';

-- Vishnu Shaji (DOB: 1994-03-11, DOJ: 2022-05-18)
UPDATE users 
SET dob = '1994-03-11', 
    joining_date = '2022-05-18', 
    probation_end_date = '2022-11-18',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'vishnushaji'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Vishnu Shaji')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'vishnushaji%';

-- Justin Jose (DOB: 1991-04-30, DOJ: 2022-07-04)
UPDATE users 
SET dob = '1991-04-30', 
    joining_date = '2022-07-04', 
    probation_end_date = '2023-01-04',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'justinjose'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Justin Jose')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'justinjose%';

-- Neethu Shaji (DOB: 1999-07-14, DOJ: 2022-08-22)
UPDATE users 
SET dob = '1999-07-14', 
    joining_date = '2022-08-22', 
    probation_end_date = '2023-02-22',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'neethushaji'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Neethu Shaji')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'neethushaji%';

-- Ajay Babu N (DOB: 1999-04-24, DOJ: 2022-12-19)
UPDATE users 
SET dob = '1999-04-24', 
    joining_date = '2022-12-19', 
    probation_end_date = '2023-06-19',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'ajaybabun'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Ajay Babu N')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'ajaybabun%';

-- Bindhu V (DOB: 1992-02-21, DOJ: 2023-02-08)
UPDATE users 
SET dob = '1992-02-21', 
    joining_date = '2023-02-08', 
    probation_end_date = '2023-08-08',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'bindhuv'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Bindhu V')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'bindhuv%';

-- Abdullah Mohammedali (DOB: 1999-02-04, DOJ: 2023-02-20)
UPDATE users 
SET dob = '1999-02-04', 
    joining_date = '2023-02-20', 
    probation_end_date = '2023-08-20',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'abdullahmohammedali'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Abdullah Mohammedali')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'abdullahmohammedali%';

-- Jacob Binoy (DOB: 1995-08-24, DOJ: 2023-03-27)
UPDATE users 
SET dob = '1995-08-24', 
    joining_date = '2023-03-27', 
    probation_end_date = '2023-09-27',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'jacobbinoy'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Jacob Binoy')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'jacobbinoy%';

-- Ameesha Helan O R (DOB: 1997-10-28, DOJ: 2023-05-02)
UPDATE users 
SET dob = '1997-10-28', 
    joining_date = '2023-05-02', 
    probation_end_date = '2023-11-02',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'ameeshahelanor'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Ameesha Helan O R')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'ameeshahelanor%';

-- Suchith Lal (DOB: 1998-09-10, DOJ: 2023-07-03)
UPDATE users 
SET dob = '1998-09-10', 
    joining_date = '2023-07-03', 
    probation_end_date = '2024-01-03',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'suchithlal'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Suchith Lal')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'suchithlal%';

-- Abhiram P Mohan (DOB: 1992-08-07, DOJ: 2023-07-11)
UPDATE users 
SET dob = '1992-08-07', 
    joining_date = '2023-07-11', 
    probation_end_date = '2024-01-11',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'abhirampmohan'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Abhiram P Mohan')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'abhirampmohan%';

-- Vaishnav Vijayan (DOB: 1998-02-16, DOJ: 2023-07-26)
UPDATE users 
SET dob = '1998-02-16', 
    joining_date = '2023-07-26', 
    probation_end_date = '2024-01-26',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'vaishnavvijayan'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Vaishnav Vijayan')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'vaishnavvijayan%';

-- Jishnu V Gopal (DOB: 1997-09-10, DOJ: 2023-08-16)
UPDATE users 
SET dob = '1997-09-10', 
    joining_date = '2023-08-16', 
    probation_end_date = '2024-02-16',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'jishnuvgopal'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Jishnu V Gopal')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'jishnuvgopal%';

-- Athanasius Abram Punnoose (DOB: 1989-06-30, DOJ: 2023-11-29)
UPDATE users 
SET dob = '1989-06-30', 
    joining_date = '2023-11-29', 
    probation_end_date = '2024-05-29',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'athanasiusabrampunnoose'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Athanasius Abram Punnoose')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'athanasiusabrampunnoose%';

-- Anu Varghese (DOB: 1993-04-21, DOJ: 2023-12-26)
UPDATE users 
SET dob = '1993-04-21', 
    joining_date = '2023-12-26', 
    probation_end_date = '2024-06-26',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'anuvarghese'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Anu Varghese')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'anuvarghese%';

-- Amrutha Lakshmi (DOB: 1996-10-08, DOJ: 2024-01-03)
UPDATE users 
SET dob = '1996-10-08', 
    joining_date = '2024-01-03', 
    probation_end_date = '2024-07-03',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'amruthalakshmi'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Amrutha Lakshmi')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'amruthalakshmi%';

-- Mohammed Afsal K (DOB: 1998-12-18, DOJ: 2024-02-05)
UPDATE users 
SET dob = '1998-12-18', 
    joining_date = '2024-02-05', 
    probation_end_date = '2024-08-05',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'mohammedafsalk'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Mohammed Afsal K')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'mohammedafsalk%';

-- Priya K (DOB: 1999-04-15, DOJ: 2024-02-12)
UPDATE users 
SET dob = '1999-04-15', 
    joining_date = '2024-02-12', 
    probation_end_date = '2024-08-12',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'priyak'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Priya K')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'priyak%';

-- Mulashiya Sameer Gopalbhai (DOB: 1992-03-04, DOJ: 2024-01-10)
UPDATE users 
SET dob = '1992-03-04', 
    joining_date = '2024-01-10', 
    probation_end_date = '2024-07-10',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'mulashiyasameergopalbhai'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Mulashiya Sameer Gopalbhai')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'mulashiyasameergopalbhai%';

-- K Abish (DOB: 2000-05-23, DOJ: 2024-02-26)
UPDATE users 
SET dob = '2000-05-23', 
    joining_date = '2024-02-26', 
    probation_end_date = '2024-08-26',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'kabish'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('K Abish')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'kabish%';

-- Vishnupriya CP (DOB: 1999-12-16, DOJ: 2024-03-18)
UPDATE users 
SET dob = '1999-12-16', 
    joining_date = '2024-03-18', 
    probation_end_date = '2024-09-18',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'vishnupriyacp'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Vishnupriya CP')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'vishnupriyacp%';

-- Swetha G (DOB: 1990-05-26, DOJ: 2024-03-26)
UPDATE users 
SET dob = '1990-05-26', 
    joining_date = '2024-03-26', 
    probation_end_date = '2024-09-26',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'swethag'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Swetha G')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'swethag%';

-- Vishnu K K (DOB: 2000-02-17, DOJ: 2024-03-26)
UPDATE users 
SET dob = '2000-02-17', 
    joining_date = '2024-03-26', 
    probation_end_date = '2024-09-26',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'vishnukk'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Vishnu K K')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'vishnukk%';

-- Aswathi M (DOB: 1995-07-20, DOJ: 2024-05-07)
UPDATE users 
SET dob = '1995-07-20', 
    joining_date = '2024-05-07', 
    probation_end_date = '2024-11-07',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'aswathim'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Aswathi M')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'aswathim%';

-- Kiran A G (DOB: 1997-05-17, DOJ: 2024-05-08)
UPDATE users 
SET dob = '1997-05-17', 
    joining_date = '2024-05-08', 
    probation_end_date = '2024-11-08',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'kiranag'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Kiran A G')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'kiranag%';

-- Abhiram M V (DOB: 2000-11-17, DOJ: 2024-05-20)
UPDATE users 
SET dob = '2000-11-17', 
    joining_date = '2024-05-20', 
    probation_end_date = '2024-11-20',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'abhirammv'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Abhiram M V')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'abhirammv%';

-- Adiya Siyad (DOB: 1997-07-09, DOJ: 2024-05-27)
UPDATE users 
SET dob = '1997-07-09', 
    joining_date = '2024-05-27', 
    probation_end_date = '2024-11-27',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'adiyasiyad'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Adiya Siyad')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'adiyasiyad%';

-- Ramees Nuhman (DOB: 1999-12-17, DOJ: 2024-06-03)
UPDATE users 
SET dob = '1999-12-17', 
    joining_date = '2024-06-03', 
    probation_end_date = '2024-12-03',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'rameesnuhman'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Ramees Nuhman')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'rameesnuhman%';

-- Joshua Johnson (DOB: 2001-05-01, DOJ: 2024-07-29)
UPDATE users 
SET dob = '2001-05-01', 
    joining_date = '2024-07-29', 
    probation_end_date = '2025-01-29',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'joshuajohnson'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Joshua Johnson')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'joshuajohnson%';

-- Nikhitha M S (DOB: 2002-06-27, DOJ: 2024-08-05)
UPDATE users 
SET dob = '2002-06-27', 
    joining_date = '2024-08-05', 
    probation_end_date = '2025-02-05',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'nikhithams'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Nikhitha M S')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'nikhithams%';

-- Sejal Sebastian (DOB: 1996-05-30, DOJ: 2024-08-05)
UPDATE users 
SET dob = '1996-05-30', 
    joining_date = '2024-08-05', 
    probation_end_date = '2025-02-05',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'sejalsebastian'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Sejal Sebastian')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'sejalsebastian%';

-- Sonu S (DOB: 1999-04-02, DOJ: 2024-10-28)
UPDATE users 
SET dob = '1999-04-02', 
    joining_date = '2024-10-28', 
    probation_end_date = '2025-04-28',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'sonus'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Sonu S')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'sonus%';

-- Bijith P N (DOB: 2000-08-18, DOJ: 2024-12-09)
UPDATE users 
SET dob = '2000-08-18', 
    joining_date = '2024-12-09', 
    probation_end_date = '2025-06-09',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'bijithpn'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Bijith P N')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'bijithpn%';

-- Kiran P S (DOB: 1994-03-10, DOJ: 2025-03-03)
UPDATE users 
SET dob = '1994-03-10', 
    joining_date = '2025-03-03', 
    probation_end_date = '2025-09-03',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'kiranps'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Kiran P S')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'kiranps%';

-- Alex Mariyan Sebastian (DOB: 1997-10-16, DOJ: 2025-03-03)
UPDATE users 
SET dob = '1997-10-16', 
    joining_date = '2025-03-03', 
    probation_end_date = '2025-09-03',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'alexmariyansebastian'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Alex Mariyan Sebastian')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'alexmariyansebastian%';

-- Shifna P S (DOB: 1997-12-31, DOJ: 2025-03-10)
UPDATE users 
SET dob = '1997-12-31', 
    joining_date = '2025-03-10', 
    probation_end_date = '2025-09-10',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'shifnaps'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Shifna P S')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'shifnaps%';

-- Abhishek S (DOB: 1997-12-12, DOJ: 2025-03-17)
UPDATE users 
SET dob = '1997-12-12', 
    joining_date = '2025-03-17', 
    probation_end_date = '2025-09-17',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'abhisheks'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Abhishek S')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'abhisheks%';

-- Nikesha Sony (DOB: 2001-11-21, DOJ: 2025-03-17)
UPDATE users 
SET dob = '2001-11-21', 
    joining_date = '2025-03-17', 
    probation_end_date = '2025-09-17',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'nikeshasony'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Nikesha Sony')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'nikeshasony%';

-- Mavo Thomas (DOB: 2001-12-04, DOJ: 2025-05-05)
UPDATE users 
SET dob = '2001-12-04', 
    joining_date = '2025-05-05', 
    probation_end_date = '2025-11-05',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'mavothomas'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Mavo Thomas')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'mavothomas%';

-- Divya K V (DOB: 1994-09-09, DOJ: 2025-05-12)
UPDATE users 
SET dob = '1994-09-09', 
    joining_date = '2025-05-12', 
    probation_end_date = '2025-11-12',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'divyakv'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Divya K V')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'divyakv%';

-- Alfiya Noori (DOB: 2003-06-26, DOJ: 2025-05-26)
UPDATE users 
SET dob = '2003-06-26', 
    joining_date = '2025-05-26', 
    probation_end_date = '2025-11-26',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'alfiyanoori'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Alfiya Noori')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'alfiyanoori%';

-- Nikhil Govind O V (DOB: 2003-04-16, DOJ: 2025-06-09)
UPDATE users 
SET dob = '2003-04-16', 
    joining_date = '2025-06-09', 
    probation_end_date = '2025-12-09',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'nikhilgovindov'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Nikhil Govind O V')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'nikhilgovindov%';

-- Milda E M (DOB: 1996-11-18, DOJ: 2025-06-16)
UPDATE users 
SET dob = '1996-11-18', 
    joining_date = '2025-06-16', 
    probation_end_date = '2025-12-16',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'mildaem'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Milda E M')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'mildaem%';

-- Meenakshi R (DOB: 2002-09-28, DOJ: 2025-12-22)
UPDATE users 
SET dob = '2002-09-28', 
    joining_date = '2025-12-22', 
    probation_end_date = '2026-06-22',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'meenakshir'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Meenakshi R')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'meenakshir%';

-- Sreelakshmi S Menon (DOB: 2004-01-10, DOJ: 2026-01-29)
UPDATE users 
SET dob = '2004-01-10', 
    joining_date = '2026-01-29', 
    probation_end_date = '2026-07-29',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'sreelakshmismenon'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Sreelakshmi S Menon')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'sreelakshmismenon%';

-- Renjith R Krishnan (DOB: 2000-11-11, DOJ: 2026-02-03)
UPDATE users 
SET dob = '2000-11-11', 
    joining_date = '2026-02-03', 
    probation_end_date = '2026-08-03',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'renjithrkrishnan'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Renjith R Krishnan')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'renjithrkrishnan%';

-- Amal Tomy (DOB: 2000-04-04, DOJ: 2026-02-16)
UPDATE users 
SET dob = '2000-04-04', 
    joining_date = '2026-02-16', 
    probation_end_date = '2026-08-16',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'amaltomy'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Amal Tomy')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'amaltomy%';

-- Vishnu Prasad M (DOB: 2002-11-20, DOJ: 2026-02-16)
UPDATE users 
SET dob = '2002-11-20', 
    joining_date = '2026-02-16', 
    probation_end_date = '2026-08-16',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'vishnuprasadm'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Vishnu Prasad M')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'vishnuprasadm%';

-- Gautam Santhosh (DOB: 1992-10-17, DOJ: 2026-03-09)
UPDATE users 
SET dob = '1992-10-17', 
    joining_date = '2026-03-09', 
    probation_end_date = '2026-09-09',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'gautamsanthosh'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Gautam Santhosh')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'gautamsanthosh%';

-- Luquman Bin Abdulla (DOB: 2001-04-12, DOJ: 2026-03-17)
UPDATE users 
SET dob = '2001-04-12', 
    joining_date = '2026-03-17', 
    probation_end_date = '2026-09-17',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'luqumanbinabdulla'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Luquman Bin Abdulla')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'luqumanbinabdulla%';

-- Jithin Wails (DOB: 1990-05-02, DOJ: 2019-06-15)
UPDATE users 
SET dob = '1990-05-02', 
    joining_date = '2019-06-15', 
    probation_end_date = '2019-12-15',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'jithinwails'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Jithin Wails')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'jithinwails%';

-- Rony G Umman (DOB: 1985-02-04, DOJ: 2021-03-03)
UPDATE users 
SET dob = '1985-02-04', 
    joining_date = '2021-03-03', 
    probation_end_date = '2021-09-03',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'ronygumman'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Rony G Umman')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'ronygumman%';

-- Jijo Jose (DOB: 1991-10-25, DOJ: 2022-08-03)
UPDATE users 
SET dob = '1991-10-25', 
    joining_date = '2022-08-03', 
    probation_end_date = '2023-02-03',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'jijojose'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Jijo Jose')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'jijojose%';

-- Bonies Doyal (DOB: 1990-06-14, DOJ: 2021-06-23)
UPDATE users 
SET dob = '1990-06-14', 
    joining_date = '2021-06-23', 
    probation_end_date = '2021-12-23',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'boniesdoyal'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Bonies Doyal')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'boniesdoyal%';

-- Shaino Sajimon (DOB: 2001-10-25, DOJ: 2024-02-21)
UPDATE users 
SET dob = '2001-10-25', 
    joining_date = '2024-02-21', 
    probation_end_date = '2024-08-21',
    updated_at = NOW()
WHERE LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) = 'shainosajimon'
   OR LOWER(TRIM(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))))) = LOWER('Shaino Sajimon')
   OR LOWER(REPLACE(CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))), ' ', '')) LIKE 'shainosajimon%';


COMMIT;
