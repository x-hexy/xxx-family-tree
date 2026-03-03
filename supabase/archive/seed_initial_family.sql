-- Seed generated from updated Excel: family tree.xlsx
-- Safe to rerun: it clears current members/relationships first.

begin;

delete from public.relationships;
delete from public.members;

-- -----------------------------
-- Members
-- generation:
-- 1 = 祖辈（爷爷奶奶、外公外婆）
-- 2 = 父母辈
-- 3 = 你与堂表兄弟姐妹辈
-- 4 = 下一辈
-- -----------------------------
insert into public.members (id, name, generation) values
-- 第一代
('m_pgpa', '我爷爷', 1),
('m_pgma', '我奶奶', 1),
('m_mgpa', '我外公', 1),
('m_mgma', '我外婆', 1),

-- 第二代（父系）
('m_father', '我爸爸', 2),
('m_mother', '我妈妈', 2),
('m_bigaunt', '大姑姑', 2),
('m_bigaunt_husband', '大姑父', 2),
('m_smallaunt', '小姑姑', 2),
('m_smallaunt_husband', '小姑夫', 2),
('m_uncle', '叔叔', 2),
('m_uncle_wife', '阿姨', 2),

-- 第二代（母系）
('m_biguncle_m', '大舅舅', 2),
('m_biguncle_wife_m', '大舅妈', 2),
('m_smalluncle_m', '小舅舅', 2),
('m_smalluncle_wife_m', '小舅妈', 2),
('m_aunt_m', '小阿姨', 2),
('m_aunt_husband_m', '小姨父', 2),
('m_elder_sis_m', '大姐姐', 2),
('m_elder_sis_husband_m', '大姐夫', 2),
('m_younger_sis_m', '小姐姐', 2),
('m_younger_sis_husband_m', '小姐夫', 2),

-- 第三代
('m_me', '我', 3),
('m_me_wife', '我老婆', 3),
('m_A', '大姑姑儿子A', 3),
('m_A_wife', 'A的老婆', 3),
('m_B', '大姑姑女儿B', 3),
('m_B_husband', 'B的老公', 3),
('m_C', '小姑姑女儿C', 3),
('m_C_husband', 'C的老公', 3),
('m_D', '小姑姑女儿D', 3),
('m_D_husband', 'D的老公', 3),
('m_E', '叔叔女儿E', 3),
('m_F', '大舅舅儿子F', 3),
('m_F_wife', 'F的老婆', 3),
('m_G', '小舅舅儿子G', 3),
('m_G_wife', 'G的老婆', 3),
('m_H', '小阿姨儿子H', 3),
('m_H_wife', 'H的老婆', 3),
('m_I', '大姐姐女儿I', 3),
('m_I_husband', 'I的老公', 3),
('m_J', '小姐姐儿子J', 3),

-- 第四代
('m_me_son', '我的儿子', 4),
('m_me_daughter', '我的女儿', 4),
('m_A_daughter', 'A的女儿', 4),
('m_B_son', 'B的儿子', 4),
('m_C_daughter', 'C的女儿', 4),
('m_C_son', 'C的儿子', 4),
('m_D_daughter', 'D的女儿', 4),
('m_D_son', 'D的儿子', 4),
('m_F_son_k', 'F的儿子K', 4),
('m_F_son_l', 'F的儿子L', 4),
('m_G_son', 'G的儿子', 4),
('m_H_daughter', 'H的女儿', 4),
('m_I_daughter', 'I的女儿', 4);

-- -----------------------------
-- Spouse relationships
-- -----------------------------
insert into public.relationships (id, from_member_id, to_member_id, relation_type) values
('r_sp_pg', 'm_pgpa', 'm_pgma', 'spouse'),
('r_sp_mg', 'm_mgpa', 'm_mgma', 'spouse'),
('r_sp_fm', 'm_father', 'm_mother', 'spouse'),
('r_sp_bigaunt', 'm_bigaunt_husband', 'm_bigaunt', 'spouse'),
('r_sp_smallaunt', 'm_smallaunt_husband', 'm_smallaunt', 'spouse'),
('r_sp_uncle', 'm_uncle', 'm_uncle_wife', 'spouse'),
('r_sp_biguncle_m', 'm_biguncle_m', 'm_biguncle_wife_m', 'spouse'),
('r_sp_smalluncle_m', 'm_smalluncle_m', 'm_smalluncle_wife_m', 'spouse'),
('r_sp_aunt_m', 'm_aunt_husband_m', 'm_aunt_m', 'spouse'),
('r_sp_elder_sis_m', 'm_elder_sis_m', 'm_elder_sis_husband_m', 'spouse'),
('r_sp_younger_sis_m', 'm_younger_sis_m', 'm_younger_sis_husband_m', 'spouse'),
('r_sp_me', 'm_me', 'm_me_wife', 'spouse'),
('r_sp_A', 'm_A', 'm_A_wife', 'spouse'),
('r_sp_B', 'm_B', 'm_B_husband', 'spouse'),
('r_sp_C', 'm_C', 'm_C_husband', 'spouse'),
('r_sp_D', 'm_D', 'm_D_husband', 'spouse'),
('r_sp_F', 'm_F', 'm_F_wife', 'spouse'),
('r_sp_G', 'm_G', 'm_G_wife', 'spouse'),
('r_sp_H', 'm_H', 'm_H_wife', 'spouse'),
('r_sp_I', 'm_I', 'm_I_husband', 'spouse');

-- -----------------------------
-- Parent -> child relationships
-- -----------------------------
insert into public.relationships (id, from_member_id, to_member_id, relation_type) values
-- 第一代 -> 第二代（父系）
('r_p_pgpa_to_father', 'm_pgpa', 'm_father', 'parent'),
('r_p_pgma_to_father', 'm_pgma', 'm_father', 'parent'),
('r_p_pgpa_to_bigaunt', 'm_pgpa', 'm_bigaunt', 'parent'),
('r_p_pgma_to_bigaunt', 'm_pgma', 'm_bigaunt', 'parent'),
('r_p_pgpa_to_smallaunt', 'm_pgpa', 'm_smallaunt', 'parent'),
('r_p_pgma_to_smallaunt', 'm_pgma', 'm_smallaunt', 'parent'),
('r_p_pgpa_to_uncle', 'm_pgpa', 'm_uncle', 'parent'),
('r_p_pgma_to_uncle', 'm_pgma', 'm_uncle', 'parent'),

-- 第一代 -> 第二代（母系）
('r_p_mgpa_to_mother', 'm_mgpa', 'm_mother', 'parent'),
('r_p_mgma_to_mother', 'm_mgma', 'm_mother', 'parent'),
('r_p_mgpa_to_biguncle', 'm_mgpa', 'm_biguncle_m', 'parent'),
('r_p_mgma_to_biguncle', 'm_mgma', 'm_biguncle_m', 'parent'),
('r_p_mgpa_to_smalluncle', 'm_mgpa', 'm_smalluncle_m', 'parent'),
('r_p_mgma_to_smalluncle', 'm_mgma', 'm_smalluncle_m', 'parent'),
('r_p_mgpa_to_aunt', 'm_mgpa', 'm_aunt_m', 'parent'),
('r_p_mgma_to_aunt', 'm_mgma', 'm_aunt_m', 'parent'),
('r_p_mgpa_to_elder_sis', 'm_mgpa', 'm_elder_sis_m', 'parent'),
('r_p_mgma_to_elder_sis', 'm_mgma', 'm_elder_sis_m', 'parent'),
('r_p_mgpa_to_younger_sis', 'm_mgpa', 'm_younger_sis_m', 'parent'),
('r_p_mgma_to_younger_sis', 'm_mgma', 'm_younger_sis_m', 'parent'),

-- 第二代 -> 第三代
('r_p_father_to_me', 'm_father', 'm_me', 'parent'),
('r_p_mother_to_me', 'm_mother', 'm_me', 'parent'),
('r_p_bigaunt_to_A', 'm_bigaunt', 'm_A', 'parent'),
('r_p_bigaunt_husband_to_A', 'm_bigaunt_husband', 'm_A', 'parent'),
('r_p_bigaunt_to_B', 'm_bigaunt', 'm_B', 'parent'),
('r_p_bigaunt_husband_to_B', 'm_bigaunt_husband', 'm_B', 'parent'),
('r_p_smallaunt_to_C', 'm_smallaunt', 'm_C', 'parent'),
('r_p_smallaunt_husband_to_C', 'm_smallaunt_husband', 'm_C', 'parent'),
('r_p_smallaunt_to_D', 'm_smallaunt', 'm_D', 'parent'),
('r_p_smallaunt_husband_to_D', 'm_smallaunt_husband', 'm_D', 'parent'),
('r_p_uncle_to_E', 'm_uncle', 'm_E', 'parent'),
('r_p_uncle_wife_to_E', 'm_uncle_wife', 'm_E', 'parent'),
('r_p_biguncle_to_F', 'm_biguncle_m', 'm_F', 'parent'),
('r_p_biguncle_wife_to_F', 'm_biguncle_wife_m', 'm_F', 'parent'),
('r_p_smalluncle_to_G', 'm_smalluncle_m', 'm_G', 'parent'),
('r_p_smalluncle_wife_to_G', 'm_smalluncle_wife_m', 'm_G', 'parent'),
('r_p_aunt_to_H', 'm_aunt_m', 'm_H', 'parent'),
('r_p_aunt_husband_to_H', 'm_aunt_husband_m', 'm_H', 'parent'),
('r_p_elder_sis_to_I', 'm_elder_sis_m', 'm_I', 'parent'),
('r_p_elder_sis_husband_to_I', 'm_elder_sis_husband_m', 'm_I', 'parent'),
('r_p_younger_sis_to_J', 'm_younger_sis_m', 'm_J', 'parent'),
('r_p_younger_sis_husband_to_J', 'm_younger_sis_husband_m', 'm_J', 'parent'),

-- 第三代 -> 第四代
('r_p_me_to_son', 'm_me', 'm_me_son', 'parent'),
('r_p_mewife_to_son', 'm_me_wife', 'm_me_son', 'parent'),
('r_p_me_to_daughter', 'm_me', 'm_me_daughter', 'parent'),
('r_p_mewife_to_daughter', 'm_me_wife', 'm_me_daughter', 'parent'),
('r_p_A_to_daughter', 'm_A', 'm_A_daughter', 'parent'),
('r_p_Awife_to_daughter', 'm_A_wife', 'm_A_daughter', 'parent'),
('r_p_B_to_son', 'm_B', 'm_B_son', 'parent'),
('r_p_Bhusband_to_son', 'm_B_husband', 'm_B_son', 'parent'),
('r_p_C_to_daughter', 'm_C', 'm_C_daughter', 'parent'),
('r_p_Chusband_to_daughter', 'm_C_husband', 'm_C_daughter', 'parent'),
('r_p_C_to_son', 'm_C', 'm_C_son', 'parent'),
('r_p_Chusband_to_son', 'm_C_husband', 'm_C_son', 'parent'),
('r_p_D_to_daughter', 'm_D', 'm_D_daughter', 'parent'),
('r_p_Dhusband_to_daughter', 'm_D_husband', 'm_D_daughter', 'parent'),
('r_p_D_to_son', 'm_D', 'm_D_son', 'parent'),
('r_p_Dhusband_to_son', 'm_D_husband', 'm_D_son', 'parent'),
('r_p_F_to_k', 'm_F', 'm_F_son_k', 'parent'),
('r_p_Fwife_to_k', 'm_F_wife', 'm_F_son_k', 'parent'),
('r_p_F_to_l', 'm_F', 'm_F_son_l', 'parent'),
('r_p_Fwife_to_l', 'm_F_wife', 'm_F_son_l', 'parent'),
('r_p_G_to_son', 'm_G', 'm_G_son', 'parent'),
('r_p_Gwife_to_son', 'm_G_wife', 'm_G_son', 'parent'),
('r_p_H_to_daughter', 'm_H', 'm_H_daughter', 'parent'),
('r_p_Hwife_to_daughter', 'm_H_wife', 'm_H_daughter', 'parent'),
('r_p_I_to_daughter', 'm_I', 'm_I_daughter', 'parent'),
('r_p_Ihusband_to_daughter', 'm_I_husband', 'm_I_daughter', 'parent');

commit;
