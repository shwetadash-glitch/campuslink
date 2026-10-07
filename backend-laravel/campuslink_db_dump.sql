--
-- PostgreSQL database dump
--

\restrict sRt3hMW93NY40DSVty4OkGipgf08qkUt54fH9VRYgCmLeBsIG0EbRxJTRpACUEU

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: applications; Type: TABLE; Schema: public; Owner: campuslink
--

CREATE TABLE public.applications (
    id bigint NOT NULL,
    student_id bigint NOT NULL,
    job_id bigint NOT NULL,
    drive_id bigint,
    status character varying(255) DEFAULT 'APPLIED'::character varying NOT NULL,
    applied_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.applications OWNER TO campuslink;

--
-- Name: applications_id_seq; Type: SEQUENCE; Schema: public; Owner: campuslink
--

CREATE SEQUENCE public.applications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.applications_id_seq OWNER TO campuslink;

--
-- Name: applications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: campuslink
--

ALTER SEQUENCE public.applications_id_seq OWNED BY public.applications.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: campuslink
--

CREATE TABLE public.audit_logs (
    id bigint NOT NULL,
    user_id bigint,
    entity_type character varying(255) NOT NULL,
    entity_id integer NOT NULL,
    action character varying(255) NOT NULL,
    old_values json,
    new_values json,
    "timestamp" timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    request_metadata json
);


ALTER TABLE public.audit_logs OWNER TO campuslink;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: campuslink
--

CREATE SEQUENCE public.audit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO campuslink;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: campuslink
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: cache; Type: TABLE; Schema: public; Owner: campuslink
--

CREATE TABLE public.cache (
    key character varying(255) NOT NULL,
    value text NOT NULL,
    expiration bigint NOT NULL
);


ALTER TABLE public.cache OWNER TO campuslink;

--
-- Name: cache_locks; Type: TABLE; Schema: public; Owner: campuslink
--

CREATE TABLE public.cache_locks (
    key character varying(255) NOT NULL,
    owner character varying(255) NOT NULL,
    expiration bigint NOT NULL
);


ALTER TABLE public.cache_locks OWNER TO campuslink;

--
-- Name: companies; Type: TABLE; Schema: public; Owner: campuslink
--

CREATE TABLE public.companies (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    industry character varying(255),
    website character varying(255),
    size character varying(255),
    headquarters character varying(255),
    logo_url character varying(255),
    metadata_json json,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.companies OWNER TO campuslink;

--
-- Name: companies_id_seq; Type: SEQUENCE; Schema: public; Owner: campuslink
--

CREATE SEQUENCE public.companies_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.companies_id_seq OWNER TO campuslink;

--
-- Name: companies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: campuslink
--

ALTER SEQUENCE public.companies_id_seq OWNED BY public.companies.id;


--
-- Name: drive_candidates; Type: TABLE; Schema: public; Owner: campuslink
--

CREATE TABLE public.drive_candidates (
    id bigint NOT NULL,
    drive_id bigint NOT NULL,
    student_id bigint NOT NULL,
    status character varying(255) DEFAULT 'REGISTERED'::character varying NOT NULL,
    eligibility_score double precision,
    eligibility_details json,
    registered_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.drive_candidates OWNER TO campuslink;

--
-- Name: drive_candidates_id_seq; Type: SEQUENCE; Schema: public; Owner: campuslink
--

CREATE SEQUENCE public.drive_candidates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.drive_candidates_id_seq OWNER TO campuslink;

--
-- Name: drive_candidates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: campuslink
--

ALTER SEQUENCE public.drive_candidates_id_seq OWNED BY public.drive_candidates.id;


--
-- Name: drive_schedules; Type: TABLE; Schema: public; Owner: campuslink
--

CREATE TABLE public.drive_schedules (
    id bigint NOT NULL,
    drive_id bigint NOT NULL,
    student_id bigint NOT NULL,
    interviewer_ref character varying(255),
    venue character varying(255),
    start_time timestamp(0) without time zone NOT NULL,
    end_time timestamp(0) without time zone NOT NULL,
    status character varying(255) DEFAULT 'SCHEDULED'::character varying NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.drive_schedules OWNER TO campuslink;

--
-- Name: drive_schedules_id_seq; Type: SEQUENCE; Schema: public; Owner: campuslink
--

CREATE SEQUENCE public.drive_schedules_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.drive_schedules_id_seq OWNER TO campuslink;

--
-- Name: drive_schedules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: campuslink
--

ALTER SEQUENCE public.drive_schedules_id_seq OWNED BY public.drive_schedules.id;


--
-- Name: failed_jobs; Type: TABLE; Schema: public; Owner: campuslink
--

CREATE TABLE public.failed_jobs (
    id bigint NOT NULL,
    uuid character varying(255) NOT NULL,
    connection character varying(255) NOT NULL,
    queue character varying(255) NOT NULL,
    payload text NOT NULL,
    exception text NOT NULL,
    failed_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.failed_jobs OWNER TO campuslink;

--
-- Name: failed_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: campuslink
--

CREATE SEQUENCE public.failed_jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.failed_jobs_id_seq OWNER TO campuslink;

--
-- Name: failed_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: campuslink
--

ALTER SEQUENCE public.failed_jobs_id_seq OWNED BY public.failed_jobs.id;


--
-- Name: interviews; Type: TABLE; Schema: public; Owner: campuslink
--

CREATE TABLE public.interviews (
    id bigint NOT NULL,
    application_id bigint NOT NULL,
    scheduled_start timestamp(0) without time zone NOT NULL,
    scheduled_end timestamp(0) without time zone NOT NULL,
    interview_type character varying(255) NOT NULL,
    score double precision,
    feedback text,
    status character varying(255) DEFAULT 'SCHEDULED'::character varying NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.interviews OWNER TO campuslink;

--
-- Name: interviews_id_seq; Type: SEQUENCE; Schema: public; Owner: campuslink
--

CREATE SEQUENCE public.interviews_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.interviews_id_seq OWNER TO campuslink;

--
-- Name: interviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: campuslink
--

ALTER SEQUENCE public.interviews_id_seq OWNED BY public.interviews.id;


--
-- Name: job_batches; Type: TABLE; Schema: public; Owner: campuslink
--

CREATE TABLE public.job_batches (
    id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    total_jobs integer NOT NULL,
    pending_jobs integer NOT NULL,
    failed_jobs integer NOT NULL,
    failed_job_ids text NOT NULL,
    options text,
    cancelled_at integer,
    created_at integer NOT NULL,
    finished_at integer
);


ALTER TABLE public.job_batches OWNER TO campuslink;

--
-- Name: job_requirements; Type: TABLE; Schema: public; Owner: campuslink
--

CREATE TABLE public.job_requirements (
    id bigint NOT NULL,
    job_id bigint NOT NULL,
    skill_id bigint NOT NULL,
    required_proficiency character varying(255) NOT NULL,
    is_mandatory boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.job_requirements OWNER TO campuslink;

--
-- Name: job_requirements_id_seq; Type: SEQUENCE; Schema: public; Owner: campuslink
--

CREATE SEQUENCE public.job_requirements_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.job_requirements_id_seq OWNER TO campuslink;

--
-- Name: job_requirements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: campuslink
--

ALTER SEQUENCE public.job_requirements_id_seq OWNED BY public.job_requirements.id;


--
-- Name: jobs; Type: TABLE; Schema: public; Owner: campuslink
--

CREATE TABLE public.jobs (
    id bigint NOT NULL,
    company_id bigint NOT NULL,
    recruiter_id bigint,
    title character varying(255) NOT NULL,
    description text NOT NULL,
    employment_type character varying(255) NOT NULL,
    location character varying(255),
    remote_type character varying(255),
    salary_range character varying(255),
    experience_requirement character varying(255),
    application_deadline timestamp(0) without time zone,
    openings integer,
    job_code character varying(255),
    job_description_json json,
    eligibility_config json,
    status character varying(255) DEFAULT 'DRAFT'::character varying NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.jobs OWNER TO campuslink;

--
-- Name: jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: campuslink
--

CREATE SEQUENCE public.jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.jobs_id_seq OWNER TO campuslink;

--
-- Name: jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: campuslink
--

ALTER SEQUENCE public.jobs_id_seq OWNED BY public.jobs.id;


--
-- Name: matching_scores; Type: TABLE; Schema: public; Owner: campuslink
--

CREATE TABLE public.matching_scores (
    id bigint NOT NULL,
    student_id bigint NOT NULL,
    job_id bigint NOT NULL,
    drive_id bigint,
    eligibility_score double precision,
    skill_similarity_score double precision,
    project_relevance_score double precision,
    academic_score double precision,
    interview_score double precision,
    final_score double precision NOT NULL,
    model_version character varying(255),
    explanation_data json,
    calculated_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.matching_scores OWNER TO campuslink;

--
-- Name: matching_scores_id_seq; Type: SEQUENCE; Schema: public; Owner: campuslink
--

CREATE SEQUENCE public.matching_scores_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.matching_scores_id_seq OWNER TO campuslink;

--
-- Name: matching_scores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: campuslink
--

ALTER SEQUENCE public.matching_scores_id_seq OWNED BY public.matching_scores.id;


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: campuslink
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    migration character varying(255) NOT NULL,
    batch integer NOT NULL
);


ALTER TABLE public.migrations OWNER TO campuslink;

--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: campuslink
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.migrations_id_seq OWNER TO campuslink;

--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: campuslink
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: campuslink
--

CREATE TABLE public.notifications (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    notification_type character varying(255) NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    channel character varying(255) DEFAULT 'IN_APP'::character varying NOT NULL,
    status character varying(255) DEFAULT 'PENDING'::character varying NOT NULL,
    scheduled_at timestamp(0) without time zone,
    sent_at timestamp(0) without time zone,
    read_at timestamp(0) without time zone,
    metadata_json json,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.notifications OWNER TO campuslink;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: campuslink
--

CREATE SEQUENCE public.notifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO campuslink;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: campuslink
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: offer_documents; Type: TABLE; Schema: public; Owner: campuslink
--

CREATE TABLE public.offer_documents (
    id bigint NOT NULL,
    offer_id bigint NOT NULL,
    document_type character varying(255) NOT NULL,
    file_url character varying(255) NOT NULL,
    verification_status character varying(255) DEFAULT 'PENDING'::character varying NOT NULL,
    verified_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.offer_documents OWNER TO campuslink;

--
-- Name: offer_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: campuslink
--

CREATE SEQUENCE public.offer_documents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.offer_documents_id_seq OWNER TO campuslink;

--
-- Name: offer_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: campuslink
--

ALTER SEQUENCE public.offer_documents_id_seq OWNED BY public.offer_documents.id;


--
-- Name: offers; Type: TABLE; Schema: public; Owner: campuslink
--

CREATE TABLE public.offers (
    id bigint NOT NULL,
    student_id bigint NOT NULL,
    recruiter_id bigint NOT NULL,
    job_id bigint NOT NULL,
    application_id bigint,
    status character varying(255) DEFAULT 'PENDING'::character varying NOT NULL,
    ctc double precision NOT NULL,
    offer_date timestamp(0) without time zone NOT NULL,
    acceptance_date timestamp(0) without time zone,
    joining_date timestamp(0) without time zone,
    deferral_info text,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.offers OWNER TO campuslink;

--
-- Name: offers_id_seq; Type: SEQUENCE; Schema: public; Owner: campuslink
--

CREATE SEQUENCE public.offers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.offers_id_seq OWNER TO campuslink;

--
-- Name: offers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: campuslink
--

ALTER SEQUENCE public.offers_id_seq OWNED BY public.offers.id;


--
-- Name: personal_access_tokens; Type: TABLE; Schema: public; Owner: campuslink
--

CREATE TABLE public.personal_access_tokens (
    id bigint NOT NULL,
    tokenable_type character varying(255) NOT NULL,
    tokenable_id bigint NOT NULL,
    name text NOT NULL,
    token character varying(64) NOT NULL,
    abilities text,
    last_used_at timestamp(0) without time zone,
    expires_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.personal_access_tokens OWNER TO campuslink;

--
-- Name: personal_access_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: campuslink
--

CREATE SEQUENCE public.personal_access_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.personal_access_tokens_id_seq OWNER TO campuslink;

--
-- Name: personal_access_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: campuslink
--

ALTER SEQUENCE public.personal_access_tokens_id_seq OWNED BY public.personal_access_tokens.id;


--
-- Name: placement_drives; Type: TABLE; Schema: public; Owner: campuslink
--

CREATE TABLE public.placement_drives (
    id bigint NOT NULL,
    company_id bigint NOT NULL,
    job_id bigint NOT NULL,
    name character varying(255) NOT NULL,
    drive_type character varying(255),
    registration_deadline timestamp(0) without time zone,
    start_date timestamp(0) without time zone,
    end_date timestamp(0) without time zone,
    capacity integer,
    status character varying(255) DEFAULT 'DRAFT'::character varying NOT NULL,
    metadata_json json,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.placement_drives OWNER TO campuslink;

--
-- Name: placement_drives_id_seq; Type: SEQUENCE; Schema: public; Owner: campuslink
--

CREATE SEQUENCE public.placement_drives_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.placement_drives_id_seq OWNER TO campuslink;

--
-- Name: placement_drives_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: campuslink
--

ALTER SEQUENCE public.placement_drives_id_seq OWNED BY public.placement_drives.id;


--
-- Name: queue_jobs; Type: TABLE; Schema: public; Owner: campuslink
--

CREATE TABLE public.queue_jobs (
    id bigint NOT NULL,
    queue character varying(255) NOT NULL,
    payload text NOT NULL,
    attempts smallint NOT NULL,
    reserved_at integer,
    available_at integer NOT NULL,
    created_at integer NOT NULL
);


ALTER TABLE public.queue_jobs OWNER TO campuslink;

--
-- Name: queue_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: campuslink
--

CREATE SEQUENCE public.queue_jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.queue_jobs_id_seq OWNER TO campuslink;

--
-- Name: queue_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: campuslink
--

ALTER SEQUENCE public.queue_jobs_id_seq OWNED BY public.queue_jobs.id;


--
-- Name: recruiters; Type: TABLE; Schema: public; Owner: campuslink
--

CREATE TABLE public.recruiters (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    company_id bigint NOT NULL,
    contact_name character varying(255),
    contact_email character varying(255) NOT NULL,
    contact_phone character varying(255),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.recruiters OWNER TO campuslink;

--
-- Name: recruiters_id_seq; Type: SEQUENCE; Schema: public; Owner: campuslink
--

CREATE SEQUENCE public.recruiters_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.recruiters_id_seq OWNER TO campuslink;

--
-- Name: recruiters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: campuslink
--

ALTER SEQUENCE public.recruiters_id_seq OWNED BY public.recruiters.id;


--
-- Name: skill_gaps; Type: TABLE; Schema: public; Owner: campuslink
--

CREATE TABLE public.skill_gaps (
    id bigint NOT NULL,
    student_id bigint NOT NULL,
    job_id bigint NOT NULL,
    skill_id bigint NOT NULL,
    gap_severity character varying(255) NOT NULL,
    current_level integer,
    required_level integer,
    is_mandatory boolean DEFAULT true NOT NULL,
    analysis_version character varying(255) DEFAULT 'v1.0'::character varying NOT NULL,
    recommendation text,
    calculated_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.skill_gaps OWNER TO campuslink;

--
-- Name: skill_gaps_id_seq; Type: SEQUENCE; Schema: public; Owner: campuslink
--

CREATE SEQUENCE public.skill_gaps_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.skill_gaps_id_seq OWNER TO campuslink;

--
-- Name: skill_gaps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: campuslink
--

ALTER SEQUENCE public.skill_gaps_id_seq OWNED BY public.skill_gaps.id;


--
-- Name: skills; Type: TABLE; Schema: public; Owner: campuslink
--

CREATE TABLE public.skills (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    category character varying(255),
    description text,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.skills OWNER TO campuslink;

--
-- Name: skills_id_seq; Type: SEQUENCE; Schema: public; Owner: campuslink
--

CREATE SEQUENCE public.skills_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.skills_id_seq OWNER TO campuslink;

--
-- Name: skills_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: campuslink
--

ALTER SEQUENCE public.skills_id_seq OWNED BY public.skills.id;


--
-- Name: student_academic_history; Type: TABLE; Schema: public; Owner: campuslink
--

CREATE TABLE public.student_academic_history (
    id bigint NOT NULL,
    student_id bigint NOT NULL,
    qualification character varying(255) NOT NULL,
    institution character varying(255) NOT NULL,
    specialization character varying(255),
    start_year integer,
    end_year integer,
    score_value double precision NOT NULL,
    score_type character varying(255) NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.student_academic_history OWNER TO campuslink;

--
-- Name: student_academic_history_id_seq; Type: SEQUENCE; Schema: public; Owner: campuslink
--

CREATE SEQUENCE public.student_academic_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.student_academic_history_id_seq OWNER TO campuslink;

--
-- Name: student_academic_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: campuslink
--

ALTER SEQUENCE public.student_academic_history_id_seq OWNED BY public.student_academic_history.id;


--
-- Name: student_assessments; Type: TABLE; Schema: public; Owner: campuslink
--

CREATE TABLE public.student_assessments (
    id bigint NOT NULL,
    student_id bigint NOT NULL,
    assessment_type character varying(255) NOT NULL,
    score double precision NOT NULL,
    max_score double precision NOT NULL,
    assessment_date timestamp(0) without time zone NOT NULL,
    metadata_json json,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.student_assessments OWNER TO campuslink;

--
-- Name: student_assessments_id_seq; Type: SEQUENCE; Schema: public; Owner: campuslink
--

CREATE SEQUENCE public.student_assessments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.student_assessments_id_seq OWNER TO campuslink;

--
-- Name: student_assessments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: campuslink
--

ALTER SEQUENCE public.student_assessments_id_seq OWNED BY public.student_assessments.id;


--
-- Name: student_certifications; Type: TABLE; Schema: public; Owner: campuslink
--

CREATE TABLE public.student_certifications (
    id bigint NOT NULL,
    student_id bigint NOT NULL,
    name character varying(255) NOT NULL,
    issuing_org character varying(255) NOT NULL,
    issue_date timestamp(0) without time zone,
    expiry_date timestamp(0) without time zone,
    credential_id character varying(255),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.student_certifications OWNER TO campuslink;

--
-- Name: student_certifications_id_seq; Type: SEQUENCE; Schema: public; Owner: campuslink
--

CREATE SEQUENCE public.student_certifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.student_certifications_id_seq OWNER TO campuslink;

--
-- Name: student_certifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: campuslink
--

ALTER SEQUENCE public.student_certifications_id_seq OWNED BY public.student_certifications.id;


--
-- Name: student_projects; Type: TABLE; Schema: public; Owner: campuslink
--

CREATE TABLE public.student_projects (
    id bigint NOT NULL,
    student_id bigint NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    technologies character varying(255),
    project_url character varying(255),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.student_projects OWNER TO campuslink;

--
-- Name: student_projects_id_seq; Type: SEQUENCE; Schema: public; Owner: campuslink
--

CREATE SEQUENCE public.student_projects_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.student_projects_id_seq OWNER TO campuslink;

--
-- Name: student_projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: campuslink
--

ALTER SEQUENCE public.student_projects_id_seq OWNED BY public.student_projects.id;


--
-- Name: student_scores; Type: TABLE; Schema: public; Owner: campuslink
--

CREATE TABLE public.student_scores (
    id bigint NOT NULL,
    student_id bigint NOT NULL,
    score_type character varying(255) NOT NULL,
    score_value double precision NOT NULL,
    model_version character varying(255),
    explanation_data json,
    calculated_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.student_scores OWNER TO campuslink;

--
-- Name: student_scores_id_seq; Type: SEQUENCE; Schema: public; Owner: campuslink
--

CREATE SEQUENCE public.student_scores_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.student_scores_id_seq OWNER TO campuslink;

--
-- Name: student_scores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: campuslink
--

ALTER SEQUENCE public.student_scores_id_seq OWNED BY public.student_scores.id;


--
-- Name: student_skills; Type: TABLE; Schema: public; Owner: campuslink
--

CREATE TABLE public.student_skills (
    id bigint NOT NULL,
    student_id bigint NOT NULL,
    skill_id bigint NOT NULL,
    proficiency_level character varying(255) NOT NULL,
    months_experience integer DEFAULT 0 NOT NULL,
    source character varying(255),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.student_skills OWNER TO campuslink;

--
-- Name: student_skills_id_seq; Type: SEQUENCE; Schema: public; Owner: campuslink
--

CREATE SEQUENCE public.student_skills_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.student_skills_id_seq OWNER TO campuslink;

--
-- Name: student_skills_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: campuslink
--

ALTER SEQUENCE public.student_skills_id_seq OWNED BY public.student_skills.id;


--
-- Name: students; Type: TABLE; Schema: public; Owner: campuslink
--

CREATE TABLE public.students (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    student_identifier character varying(255) NOT NULL,
    first_name character varying(255) NOT NULL,
    last_name character varying(255) NOT NULL,
    branch character varying(255) NOT NULL,
    graduation_year integer NOT NULL,
    cgpa numeric(4,2),
    backlogs_current integer DEFAULT 0 NOT NULL,
    backlogs_history integer DEFAULT 0 NOT NULL,
    phone character varying(255),
    dob date,
    gender character varying(255),
    profile_picture_url character varying(255),
    resume_url character varying(255),
    profile_metadata json,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.students OWNER TO campuslink;

--
-- Name: students_id_seq; Type: SEQUENCE; Schema: public; Owner: campuslink
--

CREATE SEQUENCE public.students_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.students_id_seq OWNER TO campuslink;

--
-- Name: students_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: campuslink
--

ALTER SEQUENCE public.students_id_seq OWNED BY public.students.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: campuslink
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(255) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.users OWNER TO campuslink;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: campuslink
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO campuslink;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: campuslink
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: applications id; Type: DEFAULT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.applications ALTER COLUMN id SET DEFAULT nextval('public.applications_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: companies id; Type: DEFAULT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.companies ALTER COLUMN id SET DEFAULT nextval('public.companies_id_seq'::regclass);


--
-- Name: drive_candidates id; Type: DEFAULT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.drive_candidates ALTER COLUMN id SET DEFAULT nextval('public.drive_candidates_id_seq'::regclass);


--
-- Name: drive_schedules id; Type: DEFAULT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.drive_schedules ALTER COLUMN id SET DEFAULT nextval('public.drive_schedules_id_seq'::regclass);


--
-- Name: failed_jobs id; Type: DEFAULT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.failed_jobs ALTER COLUMN id SET DEFAULT nextval('public.failed_jobs_id_seq'::regclass);


--
-- Name: interviews id; Type: DEFAULT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.interviews ALTER COLUMN id SET DEFAULT nextval('public.interviews_id_seq'::regclass);


--
-- Name: job_requirements id; Type: DEFAULT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.job_requirements ALTER COLUMN id SET DEFAULT nextval('public.job_requirements_id_seq'::regclass);


--
-- Name: jobs id; Type: DEFAULT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.jobs ALTER COLUMN id SET DEFAULT nextval('public.jobs_id_seq'::regclass);


--
-- Name: matching_scores id; Type: DEFAULT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.matching_scores ALTER COLUMN id SET DEFAULT nextval('public.matching_scores_id_seq'::regclass);


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: offer_documents id; Type: DEFAULT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.offer_documents ALTER COLUMN id SET DEFAULT nextval('public.offer_documents_id_seq'::regclass);


--
-- Name: offers id; Type: DEFAULT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.offers ALTER COLUMN id SET DEFAULT nextval('public.offers_id_seq'::regclass);


--
-- Name: personal_access_tokens id; Type: DEFAULT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.personal_access_tokens ALTER COLUMN id SET DEFAULT nextval('public.personal_access_tokens_id_seq'::regclass);


--
-- Name: placement_drives id; Type: DEFAULT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.placement_drives ALTER COLUMN id SET DEFAULT nextval('public.placement_drives_id_seq'::regclass);


--
-- Name: queue_jobs id; Type: DEFAULT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.queue_jobs ALTER COLUMN id SET DEFAULT nextval('public.queue_jobs_id_seq'::regclass);


--
-- Name: recruiters id; Type: DEFAULT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.recruiters ALTER COLUMN id SET DEFAULT nextval('public.recruiters_id_seq'::regclass);


--
-- Name: skill_gaps id; Type: DEFAULT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.skill_gaps ALTER COLUMN id SET DEFAULT nextval('public.skill_gaps_id_seq'::regclass);


--
-- Name: skills id; Type: DEFAULT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.skills ALTER COLUMN id SET DEFAULT nextval('public.skills_id_seq'::regclass);


--
-- Name: student_academic_history id; Type: DEFAULT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.student_academic_history ALTER COLUMN id SET DEFAULT nextval('public.student_academic_history_id_seq'::regclass);


--
-- Name: student_assessments id; Type: DEFAULT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.student_assessments ALTER COLUMN id SET DEFAULT nextval('public.student_assessments_id_seq'::regclass);


--
-- Name: student_certifications id; Type: DEFAULT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.student_certifications ALTER COLUMN id SET DEFAULT nextval('public.student_certifications_id_seq'::regclass);


--
-- Name: student_projects id; Type: DEFAULT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.student_projects ALTER COLUMN id SET DEFAULT nextval('public.student_projects_id_seq'::regclass);


--
-- Name: student_scores id; Type: DEFAULT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.student_scores ALTER COLUMN id SET DEFAULT nextval('public.student_scores_id_seq'::regclass);


--
-- Name: student_skills id; Type: DEFAULT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.student_skills ALTER COLUMN id SET DEFAULT nextval('public.student_skills_id_seq'::regclass);


--
-- Name: students id; Type: DEFAULT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.students ALTER COLUMN id SET DEFAULT nextval('public.students_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: applications; Type: TABLE DATA; Schema: public; Owner: campuslink
--

COPY public.applications (id, student_id, job_id, drive_id, status, applied_at, created_at, updated_at) FROM stdin;
1	1	1	1	APPLIED	2026-09-13 17:19:03	2026-09-13 17:19:03	2026-09-13 17:19:03
2	2	1	1	APPLIED	2026-09-13 17:19:03	2026-09-13 17:19:03	2026-09-13 17:19:03
3	3	1	1	APPLIED	2026-09-13 17:19:03	2026-09-13 17:19:03	2026-09-13 17:19:03
4	4	1	1	APPLIED	2026-09-13 17:19:03	2026-09-13 17:19:03	2026-09-13 17:19:03
5	5	1	1	APPLIED	2026-09-13 17:19:03	2026-09-13 17:19:03	2026-09-13 17:19:03
6	1	27	\N	APPLIED	2026-09-13 19:59:52	2026-09-13 19:59:52	2026-09-13 19:59:52
7	1	29	\N	APPLIED	2026-09-13 20:08:29	2026-09-13 20:08:29	2026-09-13 20:08:29
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: campuslink
--

COPY public.audit_logs (id, user_id, entity_type, entity_id, action, old_values, new_values, "timestamp", request_metadata) FROM stdin;
\.


--
-- Data for Name: cache; Type: TABLE DATA; Schema: public; Owner: campuslink
--

COPY public.cache (key, value, expiration) FROM stdin;
\.


--
-- Data for Name: cache_locks; Type: TABLE DATA; Schema: public; Owner: campuslink
--

COPY public.cache_locks (key, owner, expiration) FROM stdin;
\.


--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: campuslink
--

COPY public.companies (id, name, description, industry, website, size, headquarters, logo_url, metadata_json, created_at, updated_at) FROM stdin;
2	Innovate Ltd	Startup building innovative products	IT	https://innovateltd.com	50-200	\N	\N	\N	2026-09-13 17:19:02	2026-09-13 17:19:02
3	Global Systems	Enterprise systems	Consulting	https://globalsystems.com	10000+	\N	\N	\N	2026-09-13 17:19:02	2026-09-13 17:19:02
4	Rec_audit_23bed8 Technologies	\N	Information Technology	\N	51-200	\N	\N	\N	2026-09-13 19:47:32	2026-09-13 19:47:32
5	Rec_audit_3c71ef Technologies	\N	Information Technology	\N	51-200	\N	\N	\N	2026-09-13 19:48:32	2026-09-13 19:48:32
6	Rec_audit_b37e6b Technologies	\N	Information Technology	\N	51-200	\N	\N	\N	2026-09-13 19:48:40	2026-09-13 19:48:40
7	Rec_audit_767806 Technologies	\N	Information Technology	\N	51-200	\N	\N	\N	2026-09-13 19:49:15	2026-09-13 19:49:15
8	Rec_audit_c38dde Technologies	\N	Information Technology	\N	51-200	\N	\N	\N	2026-09-13 19:49:36	2026-09-13 19:49:36
9	Rec_audit_88bccf Technologies	\N	Information Technology	\N	51-200	\N	\N	\N	2026-09-13 19:49:47	2026-09-13 19:49:47
10	Enterprise Partner 21d7f1	\N	FinTech	https://fintechpartner.com	500-1000	Mumbai	\N	\N	2026-09-13 19:59:52	2026-09-13 19:59:52
11	Enterprise Partner ce9019	\N	FinTech	https://fintechpartner.com	500-1000	Mumbai	\N	\N	2026-09-13 20:00:01	2026-09-13 20:00:01
12	Rec_audit_15cc91 Technologies	\N	Information Technology	\N	51-200	\N	\N	\N	2026-09-13 20:00:04	2026-09-13 20:00:04
13	Enterprise Partner 490811	\N	FinTech	https://fintechpartner.com	500-1000	Mumbai	\N	\N	2026-09-13 20:08:29	2026-09-13 20:08:29
14	Rec_audit_0cba94 Technologies	\N	Information Technology	\N	51-200	\N	\N	\N	2026-09-13 20:08:32	2026-09-13 20:08:32
15	Testrecruiter_real Technologies	\N	Information Technology	\N	51-200	San Francisco, CA	\N	\N	2026-09-13 20:36:14	2026-09-21 10:38:53
1	TechCorp Updated	Leading tech company	AI Solutions	https://techcorp.com	100-500	Bangalore, India	\N	\N	2026-09-13 17:19:02	2026-09-21 10:43:58
20	Binayaksabata Technologies	\N	Information Technology	\N	51-200	\N	\N	\N	2026-09-21 11:47:55	2026-09-21 11:47:55
\.


--
-- Data for Name: drive_candidates; Type: TABLE DATA; Schema: public; Owner: campuslink
--

COPY public.drive_candidates (id, drive_id, student_id, status, eligibility_score, eligibility_details, registered_at, created_at, updated_at) FROM stdin;
1	1	1	REGISTERED	\N	\N	2026-09-13 17:19:03	2026-09-13 17:19:03	2026-09-13 17:19:03
2	1	2	REGISTERED	\N	\N	2026-09-13 17:19:03	2026-09-13 17:19:03	2026-09-13 19:47:33
3	1	3	REGISTERED	\N	\N	2026-09-13 17:19:03	2026-09-13 17:19:03	2026-09-13 19:47:33
4	1	4	REGISTERED	\N	\N	2026-09-13 17:19:03	2026-09-13 17:19:03	2026-09-13 17:19:03
5	1	5	REGISTERED	\N	\N	2026-09-13 17:19:03	2026-09-13 17:19:03	2026-09-13 17:19:03
6	2	1	REGISTERED	\N	\N	2026-09-13 22:54:46	2026-09-13 17:24:45	2026-09-13 17:24:45
\.


--
-- Data for Name: drive_schedules; Type: TABLE DATA; Schema: public; Owner: campuslink
--

COPY public.drive_schedules (id, drive_id, student_id, interviewer_ref, venue, start_time, end_time, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: failed_jobs; Type: TABLE DATA; Schema: public; Owner: campuslink
--

COPY public.failed_jobs (id, uuid, connection, queue, payload, exception, failed_at) FROM stdin;
\.


--
-- Data for Name: interviews; Type: TABLE DATA; Schema: public; Owner: campuslink
--

COPY public.interviews (id, application_id, scheduled_start, scheduled_end, interview_type, score, feedback, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: job_batches; Type: TABLE DATA; Schema: public; Owner: campuslink
--

COPY public.job_batches (id, name, total_jobs, pending_jobs, failed_jobs, failed_job_ids, options, cancelled_at, created_at, finished_at) FROM stdin;
\.


--
-- Data for Name: job_requirements; Type: TABLE DATA; Schema: public; Owner: campuslink
--

COPY public.job_requirements (id, job_id, skill_id, required_proficiency, is_mandatory, created_at, updated_at) FROM stdin;
1	1	1	ADVANCED	t	2026-09-13 17:19:02	2026-09-13 17:19:02
2	1	4	INTERMEDIATE	t	2026-09-13 17:19:02	2026-09-13 17:19:02
3	1	5	INTERMEDIATE	t	2026-09-13 17:19:02	2026-09-13 17:19:02
4	1	6	INTERMEDIATE	f	2026-09-13 17:19:02	2026-09-13 17:19:02
5	2	3	INTERMEDIATE	t	2026-09-13 17:19:02	2026-09-13 17:19:02
6	2	7	INTERMEDIATE	t	2026-09-13 17:19:02	2026-09-13 17:19:02
7	3	4	ADVANCED	t	2026-09-13 17:19:02	2026-09-13 17:19:02
8	3	1	INTERMEDIATE	t	2026-09-13 17:19:02	2026-09-13 17:19:02
9	3	9	BEGINNER	f	2026-09-13 17:19:02	2026-09-13 17:19:02
10	4	5	ADVANCED	t	2026-09-13 17:19:02	2026-09-13 17:19:02
11	4	6	INTERMEDIATE	t	2026-09-13 17:19:02	2026-09-13 17:19:02
12	4	1	INTERMEDIATE	f	2026-09-13 17:19:02	2026-09-13 17:19:02
\.


--
-- Data for Name: jobs; Type: TABLE DATA; Schema: public; Owner: campuslink
--

COPY public.jobs (id, company_id, recruiter_id, title, description, employment_type, location, remote_type, salary_range, experience_requirement, application_deadline, openings, job_code, job_description_json, eligibility_config, status, created_at, updated_at) FROM stdin;
2	2	2	Frontend Intern	React Dev	Internship	\N	\N	\N	\N	\N	\N	\N	\N	{"min_cgpa": 7.0, "allowed_branches": ["Computer Science", "CSE", "IT"]}	DRAFT	2026-09-13 17:19:02	2026-09-13 17:19:02
3	3	3	Data Analyst	SQL and Python	Full-time	\N	\N	\N	\N	\N	\N	\N	\N	{"min_cgpa": 7.5}	DRAFT	2026-09-13 17:19:02	2026-09-13 17:19:02
4	1	1	DevOps Engineer	Docker and AWS	Full-time	\N	\N	\N	\N	\N	\N	\N	\N	{"min_cgpa": 7.5}	DRAFT	2026-09-13 17:19:02	2026-09-13 17:19:02
5	1	1	Machine Learning Engineer	Build ML models	Full-time	\N	Hybrid	\N	\N	\N	\N	\N	null	{"min_cgpa": 8.0, "allowed_branches": ["CSE"]}	PUBLISHED	2026-09-13 17:24:44	2026-09-13 17:24:44
6	1	1	Machine Learning Engineer	Build ML models	Full-time	\N	Hybrid	\N	\N	\N	\N	\N	null	{"min_cgpa": 8.0, "allowed_branches": ["CSE"]}	PUBLISHED	2026-09-13 18:43:01	2026-09-13 18:43:01
7	1	1	Machine Learning Engineer	Build ML models	Full-time	\N	Hybrid	\N	\N	\N	\N	\N	null	{"min_cgpa": 8.0, "allowed_branches": ["CSE"]}	PUBLISHED	2026-09-13 18:43:27	2026-09-13 18:43:27
8	1	1	Machine Learning Engineer	Build ML models	Full-time	\N	Hybrid	\N	\N	\N	\N	\N	null	{"min_cgpa": 8.0, "allowed_branches": ["CSE"]}	PUBLISHED	2026-09-13 18:49:12	2026-09-13 18:49:12
9	1	1	Machine Learning Engineer	Build ML models	Full-time	\N	Hybrid	\N	\N	\N	\N	\N	null	{"min_cgpa": 8.0, "allowed_branches": ["CSE"]}	PUBLISHED	2026-09-13 19:00:08	2026-09-13 19:00:08
10	1	1	DevOps Engineer	Responsible for managing CI/CD pipelines and infrastructure.	Full-time	\N	\N	\N	\N	\N	\N	\N	null	null	CLOSED	2026-09-13 19:00:33	2026-09-13 19:00:33
11	1	1	Machine Learning Engineer	Build ML models	Full-time	\N	Hybrid	\N	\N	\N	\N	\N	null	{"min_cgpa": 8.0, "allowed_branches": ["CSE"]}	PUBLISHED	2026-09-13 19:00:44	2026-09-13 19:00:44
12	1	1	DevOps Engineer	Responsible for managing CI/CD pipelines and infrastructure.	Full-time	\N	\N	\N	\N	\N	\N	\N	null	null	CLOSED	2026-09-13 19:00:45	2026-09-13 19:00:45
13	1	1	Machine Learning Engineer	Build ML models	Full-time	\N	Hybrid	\N	\N	\N	\N	\N	null	{"min_cgpa": 8.0, "allowed_branches": ["CSE"]}	PUBLISHED	2026-09-13 19:05:12	2026-09-13 19:05:12
14	1	1	DevOps Engineer	Responsible for managing CI/CD pipelines and infrastructure.	Full-time	\N	\N	\N	\N	\N	\N	\N	null	null	CLOSED	2026-09-13 19:05:13	2026-09-13 19:05:13
15	1	1	Machine Learning Engineer	Build ML models	Full-time	\N	Hybrid	\N	\N	\N	\N	\N	null	{"min_cgpa": 8.0, "allowed_branches": ["CSE"]}	PUBLISHED	2026-09-13 19:10:55	2026-09-13 19:10:55
16	1	1	DevOps Engineer	Responsible for managing CI/CD pipelines and infrastructure.	Full-time	\N	\N	\N	\N	\N	\N	\N	null	null	CLOSED	2026-09-13 19:10:56	2026-09-13 19:10:56
17	1	1	Machine Learning Engineer	Build ML models	Full-time	\N	Hybrid	\N	\N	\N	\N	\N	null	{"min_cgpa": 8.0, "allowed_branches": ["CSE"]}	PUBLISHED	2026-09-13 19:26:27	2026-09-13 19:26:27
18	1	1	DevOps Engineer	Responsible for managing CI/CD pipelines and infrastructure.	Full-time	\N	\N	\N	\N	\N	\N	\N	null	null	CLOSED	2026-09-13 19:26:29	2026-09-13 19:26:29
19	1	1	Machine Learning Engineer	Build ML models	Full-time	\N	Hybrid	\N	\N	\N	\N	\N	null	{"min_cgpa": 8.0, "allowed_branches": ["CSE"]}	PUBLISHED	2026-09-13 19:33:21	2026-09-13 19:33:21
20	1	1	DevOps Engineer	Responsible for managing CI/CD pipelines and infrastructure.	Full-time	\N	\N	\N	\N	\N	\N	\N	null	null	CLOSED	2026-09-13 19:33:22	2026-09-13 19:33:22
21	1	1	Machine Learning Engineer	Build ML models	Full-time	\N	Hybrid	\N	\N	\N	\N	\N	null	{"min_cgpa": 8.0, "allowed_branches": ["CSE"]}	PUBLISHED	2026-09-13 19:40:56	2026-09-13 19:40:56
22	1	1	DevOps Engineer	Responsible for managing CI/CD pipelines and infrastructure.	Full-time	\N	\N	\N	\N	\N	\N	\N	null	null	CLOSED	2026-09-13 19:40:57	2026-09-13 19:40:57
23	1	1	Machine Learning Engineer	Build ML models	Full-time	\N	Hybrid	\N	\N	\N	\N	\N	null	{"min_cgpa": 8.0, "allowed_branches": ["CSE"]}	PUBLISHED	2026-09-13 19:41:18	2026-09-13 19:41:18
24	1	1	DevOps Engineer	Responsible for managing CI/CD pipelines and infrastructure.	Full-time	\N	\N	\N	\N	\N	\N	\N	null	null	CLOSED	2026-09-13 19:41:19	2026-09-13 19:41:19
25	1	1	Machine Learning Engineer	Build ML models	Full-time	\N	Hybrid	\N	\N	\N	\N	\N	null	{"min_cgpa": 8.0, "allowed_branches": ["CSE"]}	PUBLISHED	2026-09-13 19:46:39	2026-09-13 19:46:39
26	1	1	DevOps Engineer	Responsible for managing CI/CD pipelines and infrastructure.	Full-time	\N	\N	\N	\N	\N	\N	\N	null	null	CLOSED	2026-09-13 19:46:41	2026-09-13 19:46:41
27	1	1	Machine Learning Engineer	Build ML models	Full-time	\N	Hybrid	\N	\N	\N	\N	\N	null	{"min_cgpa": 8.0, "allowed_branches": ["CSE"]}	PUBLISHED	2026-09-13 19:49:49	2026-09-13 19:49:49
28	1	1	DevOps Engineer	Responsible for managing CI/CD pipelines and infrastructure.	Full-time	\N	\N	\N	\N	\N	\N	\N	null	null	CLOSED	2026-09-13 19:49:51	2026-09-13 19:49:51
29	1	1	Machine Learning Engineer	Build ML models	Full-time	\N	Hybrid	\N	\N	\N	\N	\N	null	{"min_cgpa": 8.0, "allowed_branches": ["CSE"]}	PUBLISHED	2026-09-13 20:00:07	2026-09-13 20:00:07
30	1	1	DevOps Engineer	Responsible for managing CI/CD pipelines and infrastructure.	Full-time	\N	\N	\N	\N	\N	\N	\N	null	null	CLOSED	2026-09-13 20:00:08	2026-09-13 20:00:08
31	1	1	Machine Learning Engineer	Build ML models	Full-time	\N	Hybrid	\N	\N	\N	\N	\N	null	{"min_cgpa": 8.0, "allowed_branches": ["CSE"]}	PUBLISHED	2026-09-13 20:08:34	2026-09-13 20:08:34
32	1	1	DevOps Engineer	Responsible for managing CI/CD pipelines and infrastructure.	Full-time	\N	\N	\N	\N	\N	\N	\N	null	null	CLOSED	2026-09-13 20:08:36	2026-09-13 20:08:36
1	1	1	Software Engineer	Backend Dev	Full-time	\N	\N	\N	\N	\N	\N	\N	\N	{"min_cgpa": 8.0, "allowed_branches": ["Computer Science", "CSE", "IT"]}	PUBLISHED	2026-09-13 17:19:02	2026-09-21 10:33:52
\.


--
-- Data for Name: matching_scores; Type: TABLE DATA; Schema: public; Owner: campuslink
--

COPY public.matching_scores (id, student_id, job_id, drive_id, eligibility_score, skill_similarity_score, project_relevance_score, academic_score, interview_score, final_score, model_version, explanation_data, calculated_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: campuslink
--

COPY public.migrations (id, migration, batch) FROM stdin;
1	0001_01_01_000001_create_cache_table	1
2	0001_01_01_000002_create_jobs_table	1
3	2026_09_20_115758_create_users_table	1
4	2026_09_20_115858_create_students_table	1
5	2026_09_20_115958_create_companies_table	1
6	2026_09_20_120058_create_recruiters_table	1
7	2026_09_20_120158_create_skills_table	1
8	2026_09_20_120258_create_student_skills_table	1
9	2026_09_20_120358_create_jobs_table	1
10	2026_09_20_120458_create_job_requirements_table	1
11	2026_09_20_120758_create_placement_drives_table	1
12	2026_09_20_120858_create_drive_candidates_table	1
13	2026_09_20_120958_create_applications_table	1
14	2026_09_20_121058_create_skill_gaps_table	1
15	2026_09_20_121158_create_student_scores_table	1
16	2026_09_20_121258_create_student_projects_table	1
17	2026_09_20_121358_create_student_certifications_table	1
18	2026_09_20_121458_create_student_academic_history_table	1
19	2026_09_20_121942_create_student_assessments_table	1
20	2026_09_20_122042_create_drive_schedules_table	1
21	2026_09_20_122142_create_interviews_table	1
22	2026_09_20_122242_create_offers_table	1
23	2026_09_20_122342_create_offer_documents_table	1
24	2026_09_20_122442_create_notifications_table	1
25	2026_09_20_122542_create_matching_scores_table	1
26	2026_09_20_122642_create_audit_logs_table	1
27	2026_09_20_124042_create_personal_access_tokens_table	1
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: campuslink
--

COPY public.notifications (id, user_id, notification_type, title, message, channel, status, scheduled_at, sent_at, read_at, metadata_json, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: offer_documents; Type: TABLE DATA; Schema: public; Owner: campuslink
--

COPY public.offer_documents (id, offer_id, document_type, file_url, verification_status, verified_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: offers; Type: TABLE DATA; Schema: public; Owner: campuslink
--

COPY public.offers (id, student_id, recruiter_id, job_id, application_id, status, ctc, offer_date, acceptance_date, joining_date, deferral_info, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: personal_access_tokens; Type: TABLE DATA; Schema: public; Owner: campuslink
--

COPY public.personal_access_tokens (id, tokenable_type, tokenable_id, name, token, abilities, last_used_at, expires_at, created_at, updated_at) FROM stdin;
1	App\\Models\\User	6	auth_token	0dedec33fcc8e71df25301a64ec54287beaf354354a0f9a25f0caa1a5c4aff07	["*"]	\N	\N	2026-09-21 05:24:58	2026-09-21 05:24:58
2	App\\Models\\User	6	refresh_token	2f486ddc32da1f77d675f975ab7b92876da2f877bba6ab3ccd05f19e028cba70	["*"]	\N	\N	2026-09-21 05:24:59	2026-09-21 05:24:59
4	App\\Models\\User	6	refresh_token	789b6db7db854d4ab3e6767e342bc1d80e60f3ccc48d3150dd683bd93ba1a51c	["*"]	\N	\N	2026-09-21 05:25:04	2026-09-21 05:25:04
6	App\\Models\\User	4	refresh_token	cf24a7014d83d0f586882796c3775c61324ce086e88cef350c35406fc3987b4d	["*"]	\N	\N	2026-09-21 05:28:41	2026-09-21 05:28:41
8	App\\Models\\User	6	refresh_token	c6e0af6767e8bbf1c25a390bcbc378db210f05a5cd54dc8da40f1b2679a436c0	["*"]	\N	\N	2026-09-21 05:28:43	2026-09-21 05:28:43
10	App\\Models\\User	5	refresh_token	e8ad4eba8493592b211d1ae7209c1e546b347a72979e862c850e5ef9d5dca07c	["*"]	\N	\N	2026-09-21 05:28:45	2026-09-21 05:28:45
12	App\\Models\\User	8	refresh_token	2e86a45e5bd8821bf6c7d1b0fe47732fafbc08cf54049f82db1584d396b37c40	["*"]	\N	\N	2026-09-21 05:28:48	2026-09-21 05:28:48
5	App\\Models\\User	4	auth_token	ddfe549098614759e3e3d56aaad2750728ab478178ed6ca196b21a9feebc7438	["*"]	2026-09-21 05:28:49	\N	2026-09-21 05:28:40	2026-09-21 05:28:49
27	App\\Models\\User	6	auth_token	17d759fd513d6d3c4823261d1c438bc379e27267e2bf052d4f78414232327f14	["*"]	2026-09-21 05:30:43	\N	2026-09-21 05:30:33	2026-09-21 05:30:43
7	App\\Models\\User	6	auth_token	60e02d9ddac3df0a41e16d9ebf17d64a75de44ddac90c8aa6bb21b1bd8ab7fef	["*"]	2026-09-21 05:28:50	\N	2026-09-21 05:28:43	2026-09-21 05:28:50
9	App\\Models\\User	5	auth_token	5ec0c1f0227eae39e0ecfab917c917b1c2265f255c7290d693e89d0c7161e1d8	["*"]	2026-09-21 05:28:50	\N	2026-09-21 05:28:45	2026-09-21 05:28:50
11	App\\Models\\User	8	auth_token	a986298ee10de780074a3656657f9a6339b6792ec7055a60a3f93c789cbdc257	["*"]	2026-09-21 05:28:50	\N	2026-09-21 05:28:48	2026-09-21 05:28:50
13	App\\Models\\User	6	auth_token	ed8c1c4e5be97f3971e731d24226bd2eced59782c741cfc0a4bef0259b37ea4e	["*"]	\N	\N	2026-09-21 05:29:13	2026-09-21 05:29:13
14	App\\Models\\User	6	refresh_token	527bf114d3d32e2c0430d2ca3e043395709db31e5fc34ad9e0738d4ee393b329	["*"]	\N	\N	2026-09-21 05:29:13	2026-09-21 05:29:13
15	App\\Models\\User	5	auth_token	61ac82756456803372cc34507ee69ced18ea8cefbdf229098ede07396a1c4019	["*"]	\N	\N	2026-09-21 05:29:49	2026-09-21 05:29:49
16	App\\Models\\User	5	refresh_token	f4ec4cff80f6cd604d14619f7d510d2aa8946a464bbcf10245e504d4f84022e5	["*"]	\N	\N	2026-09-21 05:29:49	2026-09-21 05:29:49
18	App\\Models\\User	8	refresh_token	f8d90e4571f39a8f99d4b094343549ec3c265e0229a22e15a3ddc720b29b260d	["*"]	\N	\N	2026-09-21 05:29:50	2026-09-21 05:29:50
20	App\\Models\\User	4	refresh_token	43e7fc687811ff3060bd9bce8efcc24fe061af9d16d969dba566c3273601b341	["*"]	\N	\N	2026-09-21 05:29:51	2026-09-21 05:29:51
22	App\\Models\\User	6	refresh_token	0f02d37b901cd48a4f5bc0ebb6fdfa04be1e0837a003a692da7cdae45e307df3	["*"]	\N	\N	2026-09-21 05:29:53	2026-09-21 05:29:53
3	App\\Models\\User	6	auth_token	4fffd376127ae1f73a58d0644b4265f1512d387a173edc409c157dbc4db3285b	["*"]	2026-09-21 09:56:04	\N	2026-09-21 05:25:04	2026-09-21 09:56:04
21	App\\Models\\User	6	auth_token	7b6684b2724a418e9f9f3c7baf56521383d558933f503526ad116af9588251fd	["*"]	2026-09-21 05:29:57	\N	2026-09-21 05:29:53	2026-09-21 05:29:57
19	App\\Models\\User	4	auth_token	c65b28432dd55466242df9575ea75feeee34a6efd1fea247880f091c04c6cb4c	["*"]	2026-09-21 05:30:00	\N	2026-09-21 05:29:51	2026-09-21 05:30:00
17	App\\Models\\User	8	auth_token	2e942d9b807d54a9a8d28370f5d0d8b7aacdea1ce8a9ce2a9a377ea3c029f4e8	["*"]	2026-09-21 05:30:00	\N	2026-09-21 05:29:50	2026-09-21 05:30:00
23	App\\Models\\User	8	auth_token	e2db2303425b9758136bef3aef7026a7167fb48e18e93d5491faeffca7fec80a	["*"]	\N	\N	2026-09-21 05:30:30	2026-09-21 05:30:30
24	App\\Models\\User	8	refresh_token	002d6da84b885903e552f7e5bd333c58b3e80651b86ac924d1373b0977f7fb53	["*"]	\N	\N	2026-09-21 05:30:30	2026-09-21 05:30:30
25	App\\Models\\User	4	auth_token	ef4b72c341c39036b314a84103f37c5f321defd698084f19ea0d39ab717a41b5	["*"]	\N	\N	2026-09-21 05:30:31	2026-09-21 05:30:31
26	App\\Models\\User	4	refresh_token	3c7c5ad56cf82f3f8171b2c701180f4a6a558a6a5c0698f559b4d358e699213d	["*"]	\N	\N	2026-09-21 05:30:32	2026-09-21 05:30:32
28	App\\Models\\User	6	refresh_token	28b5095fd7ef72a91e0334e0bb9d147e9d24f8a0996a8ff084c94b16927adb0e	["*"]	\N	\N	2026-09-21 05:30:33	2026-09-21 05:30:33
30	App\\Models\\User	5	refresh_token	7c44219a0810fa3477366ab4a4e6858e06836b7036a96dc0150a59f981624259	["*"]	\N	\N	2026-09-21 05:30:34	2026-09-21 05:30:34
57	App\\Models\\User	6	auth_token	5535a712d8f0c16ef127129dce2d54cd21f2f44ee596c002e905c191afacc02a	["*"]	2026-09-21 05:55:08	\N	2026-09-21 05:54:55	2026-09-21 05:55:08
29	App\\Models\\User	5	auth_token	1a68b2bcd4935a5dd42089db00fd0e3ec1497ab5aa7efd9f87728f6615f8ca89	["*"]	2026-09-21 05:30:41	\N	2026-09-21 05:30:34	2026-09-21 05:30:41
31	App\\Models\\User	4	auth_token	cc923907e03fede458f4c90a29b948f5c3f096fa4fb361087b89f72e6552c687	["*"]	\N	\N	2026-09-21 05:31:26	2026-09-21 05:31:26
32	App\\Models\\User	4	refresh_token	8faa11f088c88a2b19565d245bc3ca3a53ec91aa0534f3e8fc1d6262a9fe86b1	["*"]	\N	\N	2026-09-21 05:31:26	2026-09-21 05:31:26
33	App\\Models\\User	8	auth_token	0fb4eb87bec0f9fbc6fb721bae6c64d427a8d60919c63fe5238ef4e208121f9b	["*"]	\N	\N	2026-09-21 05:31:27	2026-09-21 05:31:27
34	App\\Models\\User	8	refresh_token	bace9dac0d9e9edf99ef6f16829c1e846d9d6e0915161a66db40fbaf801918d4	["*"]	\N	\N	2026-09-21 05:31:27	2026-09-21 05:31:27
36	App\\Models\\User	5	refresh_token	aa349840853556901f30c19cd4b79110066b8351272c9bbb5a371282cbac5f29	["*"]	\N	\N	2026-09-21 05:31:30	2026-09-21 05:31:30
38	App\\Models\\User	6	refresh_token	fbbe909f50ff0f7275f7cd927669bd94de7416e7a6735380b42474abe071ba96	["*"]	\N	\N	2026-09-21 05:31:32	2026-09-21 05:31:32
35	App\\Models\\User	5	auth_token	d061562e6c45710778b07c5661776cdc93a958910f96bf3c41a5ba96143d7ccf	["*"]	2026-09-21 05:31:34	\N	2026-09-21 05:31:30	2026-09-21 05:31:34
37	App\\Models\\User	6	auth_token	e81874eb9fe540d2c84647f9310cf0462c4f2112e1ded42ae635a7a4da578cff	["*"]	2026-09-21 05:31:37	\N	2026-09-21 05:31:32	2026-09-21 05:31:37
40	App\\Models\\User	6	refresh_token	8dcd2f409d7fbea2986dce53a4d398b30f3fe71e467a8883f4addf39a0aaa626	["*"]	\N	\N	2026-09-21 05:34:06	2026-09-21 05:34:06
39	App\\Models\\User	6	auth_token	894b0901d7a057ea9ec2c2f3982134319212cb20d2f0afc208090ecd2f225bb6	["*"]	2026-09-21 05:34:06	\N	2026-09-21 05:34:06	2026-09-21 05:34:06
41	App\\Models\\User	6	auth_token	6acba2515d110d8ed400f0f444a31390c2e6a40dfc6ec768910dc044039ce9a2	["*"]	\N	\N	2026-09-21 05:36:34	2026-09-21 05:36:34
42	App\\Models\\User	6	refresh_token	a96b15918cdab222856612efc528b8feb2247da43854861df2bc4e7231a9b152	["*"]	\N	\N	2026-09-21 05:36:34	2026-09-21 05:36:34
44	App\\Models\\User	6	refresh_token	bfa95cea170a8c59df58b4f89d49b2fe9e689d4715080b10d82df95d57a235a6	["*"]	\N	\N	2026-09-21 05:42:57	2026-09-21 05:42:57
60	App\\Models\\User	6	refresh_token	874faf6697dc0d90fe41808aaf1dc17937afa5496f3e01892801297354ef31f3	["*"]	\N	\N	2026-09-21 05:56:14	2026-09-21 05:56:14
43	App\\Models\\User	6	auth_token	fbc0c6b6554656b19c2d19ae7307d1b7a4a72891eccc48d94e89289adae68d4a	["*"]	2026-09-21 05:42:59	\N	2026-09-21 05:42:57	2026-09-21 05:42:59
46	App\\Models\\User	6	refresh_token	21a8044a00caa6ce61e4f3eb833ed8a875daa30bf96c7034600194670ab41dc6	["*"]	\N	\N	2026-09-21 05:44:18	2026-09-21 05:44:18
53	App\\Models\\User	6	auth_token	bfcee9f7c505ee47f19a98d0f7a0e06de7dd2dc652977d6bcaa099cd2db4e9c6	["*"]	2026-09-21 05:53:26	\N	2026-09-21 05:53:23	2026-09-21 05:53:26
45	App\\Models\\User	6	auth_token	ebbf8b2700f81eac495f8c636359f9637026cbd69b2d5cbf3a3ca49c52b8d5d5	["*"]	2026-09-21 05:44:20	\N	2026-09-21 05:44:18	2026-09-21 05:44:20
48	App\\Models\\User	6	refresh_token	72acb4d9aadebf623ca08ed3fdbc973b601cffd8a06da86e486f6524c709a55a	["*"]	\N	\N	2026-09-21 05:51:19	2026-09-21 05:51:19
56	App\\Models\\User	6	refresh_token	3419116bd6a1028a54645b93d229f3621e48d63df424508edcc7435db39272c8	["*"]	\N	\N	2026-09-21 05:54:01	2026-09-21 05:54:01
47	App\\Models\\User	6	auth_token	d02407733c1c69fe58ae0aeae07f7a3a054b6cac91d8747be10fb0c688f9d273	["*"]	2026-09-21 05:51:21	\N	2026-09-21 05:51:19	2026-09-21 05:51:21
50	App\\Models\\User	6	refresh_token	94243dfea6b38a5719f8b690b18b9292ea5f230b6b9dfc04cd333b7be7e3adc0	["*"]	\N	\N	2026-09-21 05:52:05	2026-09-21 05:52:05
55	App\\Models\\User	6	auth_token	b8905aafea55a6a75f10d5c835f3212d0cd22ad12dd5e5cf1240a90f15a1fe73	["*"]	2026-09-21 05:54:03	\N	2026-09-21 05:54:01	2026-09-21 05:54:03
49	App\\Models\\User	6	auth_token	f36f1642b47578fd443af44df5861918304d9007a7baea6636c5cd30b457b52a	["*"]	2026-09-21 05:52:07	\N	2026-09-21 05:52:05	2026-09-21 05:52:07
52	App\\Models\\User	6	refresh_token	cbae76f3e5241f678afec0baf9aa0e5baf5d850a6114b31f3f91277ea51d8298	["*"]	\N	\N	2026-09-21 05:53:01	2026-09-21 05:53:01
51	App\\Models\\User	6	auth_token	2fb0bb8f5d5f6df2e8b4a1612b9b92ab4741de8a8635a303a1b4327dc2fc067e	["*"]	2026-09-21 05:53:01	\N	2026-09-21 05:53:01	2026-09-21 05:53:01
54	App\\Models\\User	6	refresh_token	d5f81e3fabe8576b00fade0de850bf1f350bcdda87cd1ba0aa302ed2b3e71d32	["*"]	\N	\N	2026-09-21 05:53:23	2026-09-21 05:53:23
58	App\\Models\\User	6	refresh_token	7da18e17e1131a72a6aafe81104c23a92e0441da8a5f9b9bd93b1132179ec87b	["*"]	\N	\N	2026-09-21 05:54:55	2026-09-21 05:54:55
68	App\\Models\\User	38	refresh_token	8289c36c64a5211db0c2039483e14ee1f6f1984fa83826eece441b5e8ed3694e	["*"]	\N	\N	2026-09-21 10:16:15	2026-09-21 10:16:15
59	App\\Models\\User	6	auth_token	1668ff2a91b1f7f4ba72b872f2f10a6ee8cb31feba3e656c99ea937852010c1a	["*"]	2026-09-21 05:56:18	\N	2026-09-21 05:56:14	2026-09-21 05:56:18
62	App\\Models\\User	6	refresh_token	320e762f269e01546db8bfbb07542f59f7f97289dc85f44f2e25affea754a6f5	["*"]	\N	\N	2026-09-21 05:57:16	2026-09-21 05:57:16
63	App\\Models\\User	6	auth_token	9a3f01dc782b0d337096486c377370214e805c69dfa5019b7c76b80204e30145	["*"]	2026-09-21 10:11:29	\N	2026-09-21 09:56:04	2026-09-21 10:11:29
66	App\\Models\\User	38	refresh_token	b215473ee1dfa66b0203c0bb20a3410dc2f3be7709545fb7cbcc13b726c8f8e2	["*"]	\N	\N	2026-09-21 10:15:58	2026-09-21 10:15:58
61	App\\Models\\User	6	auth_token	b54e7a79568e2587401916468b6a37ae464c0c453e5d08199eb4d17d8530de42	["*"]	2026-09-21 05:57:20	\N	2026-09-21 05:57:16	2026-09-21 05:57:20
64	App\\Models\\User	6	refresh_token	c82c88ef1ad73558e2d4ae46102e24ef8c2b04c1524590ed78ce47d5e92d67af	["*"]	\N	\N	2026-09-21 09:56:04	2026-09-21 09:56:04
65	App\\Models\\User	38	auth_token	09d08acf00ef7ef9e34be235a9ec5bc0039a67f43fa27ddc790b5f987e2702a7	["*"]	2026-09-21 10:15:58	\N	2026-09-21 10:15:58	2026-09-21 10:15:58
67	App\\Models\\User	38	auth_token	14ab6f22d55ba8e5f2485267574454876d0ac78ba08aec324e6c7d8a6d2efb48	["*"]	2026-09-21 10:16:16	\N	2026-09-21 10:16:15	2026-09-21 10:16:16
70	App\\Models\\User	38	refresh_token	9ecbf2ca667082d6c4c746041c1ffecac96ed03050f59b89f875b17a9d02fede	["*"]	\N	\N	2026-09-21 10:16:39	2026-09-21 10:16:39
69	App\\Models\\User	38	auth_token	cfd4b5175c9621c7341eacf8f7aa2da94f0fa6bdd96d953f1397d2521d4e8f2a	["*"]	2026-09-21 10:16:41	\N	2026-09-21 10:16:39	2026-09-21 10:16:41
72	App\\Models\\User	38	refresh_token	099cec97631dd728f0251f0294998313e6e1bc45f49a38c68dfb3e5c338303d4	["*"]	\N	\N	2026-09-21 10:17:05	2026-09-21 10:17:05
71	App\\Models\\User	38	auth_token	026f25b87e7da4020c38a52f9ba6a12598c809bf377787efe756003adb9912d5	["*"]	2026-09-21 10:17:07	\N	2026-09-21 10:17:05	2026-09-21 10:17:07
74	App\\Models\\User	38	refresh_token	ddfab628e2f1df4caa2829a3eaa9795436dfe27d85abb9f5936c4e89ec9435ba	["*"]	\N	\N	2026-09-21 10:17:30	2026-09-21 10:17:30
73	App\\Models\\User	38	auth_token	3b9afd06e60b2cf664f43a23856c59235f1957777b1c5b032367cda1600a15ef	["*"]	2026-09-21 10:17:31	\N	2026-09-21 10:17:30	2026-09-21 10:17:31
76	App\\Models\\User	38	refresh_token	01c86f8e8d5071dc3b967439711a1718ea77cc005f7fed346acfff8d4126ef81	["*"]	\N	\N	2026-09-21 10:17:49	2026-09-21 10:17:49
85	App\\Models\\User	1	auth_token	e959ef73801d56e58d0f8757dbc561dcf9da8e600238ba99ff597bddd8361099	["*"]	2026-09-21 10:46:55	\N	2026-09-21 10:46:29	2026-09-21 10:46:55
75	App\\Models\\User	38	auth_token	a0cab2da69bd4167a85a5141146a5e0f223ba2070fd6d660b32455ae4a706b4a	["*"]	2026-09-21 10:17:51	\N	2026-09-21 10:17:49	2026-09-21 10:17:51
78	App\\Models\\User	38	refresh_token	3227e53383792be2588876db7e7d23cfffca803a9a8b4bf899d0c0ae4e78c89f	["*"]	\N	\N	2026-09-21 10:18:20	2026-09-21 10:18:20
88	App\\Models\\User	39	refresh_token	c225bccb7f496797010e4edabbf75e88047cd77268747d78d2a1a79ce20959b4	["*"]	\N	\N	2026-09-21 11:04:54	2026-09-21 11:04:54
87	App\\Models\\User	39	auth_token	1abf49111e5a11756c298e2939a8dde55800cd457ad30edd34612e2fa5289a3d	["*"]	2026-09-21 11:04:55	\N	2026-09-21 11:04:54	2026-09-21 11:04:55
77	App\\Models\\User	38	auth_token	b8a65f4ed2fe25f7b3088aaa6e13aba46f70c533ab2ffcaaf67e23330d58df29	["*"]	2026-09-21 10:18:22	\N	2026-09-21 10:18:20	2026-09-21 10:18:22
80	App\\Models\\User	3	refresh_token	63fa1bc455d338ffc8c9cded03a16bf7f10e12d47b517be2550be9683d2e5df5	["*"]	\N	\N	2026-09-21 10:30:49	2026-09-21 10:30:49
90	App\\Models\\User	41	refresh_token	53dab9e8568b36111ba1f5e431acddf97abb24f039a5a549350fb884417fe3c4	["*"]	\N	\N	2026-09-21 11:05:06	2026-09-21 11:05:06
89	App\\Models\\User	41	auth_token	a63683a8b7b78da43ae62bc879076eadd3e147ba524eae2f823b66d495c178d3	["*"]	2026-09-21 11:05:08	\N	2026-09-21 11:05:06	2026-09-21 11:05:08
91	App\\Models\\User	42	auth_token	ffc3624a15583240583c8cd6a3c5b798adc9d6514e59bd2beba72403c3cb2ad0	["*"]	\N	\N	2026-09-21 11:05:54	2026-09-21 11:05:54
92	App\\Models\\User	42	refresh_token	166f70e572ae2f08ac72ce7a01f21aa53f7ec6ac81440cd401f02f1d67e156e7	["*"]	\N	\N	2026-09-21 11:05:54	2026-09-21 11:05:54
93	App\\Models\\User	43	auth_token	91b97cc9afa8b7951d74bb165feba74ee8d9c148559a3fdc5a960040861ac4e6	["*"]	\N	\N	2026-09-21 11:06:01	2026-09-21 11:06:01
94	App\\Models\\User	43	refresh_token	bca7e80a95f11ebadd5117d1eec87650dc65105d8211e7bae972d08e8e2d6a0f	["*"]	\N	\N	2026-09-21 11:06:01	2026-09-21 11:06:01
82	App\\Models\\User	38	refresh_token	3bdea976577f27b84fd9d7d69feccea295126d4bbf6a3555df1cd19a753e41bf	["*"]	\N	\N	2026-09-21 10:38:46	2026-09-21 10:38:46
95	App\\Models\\User	44	auth_token	bc35e74df6ecf76a58db879004597828faaad0c7d91e448a699a9b1da784b2ff	["*"]	\N	\N	2026-09-21 11:11:42	2026-09-21 11:11:42
96	App\\Models\\User	44	refresh_token	25fe5a414f180be02ab1e5a64a71b905eb36b7b90d588ebfe7cc22f5c530712f	["*"]	\N	\N	2026-09-21 11:11:42	2026-09-21 11:11:42
97	App\\Models\\User	45	auth_token	ffcb97aea94e593198fc2c8e435235df16b302d95c611c11760a9090ef1eac0e	["*"]	\N	\N	2026-09-21 11:11:48	2026-09-21 11:11:48
98	App\\Models\\User	45	refresh_token	677050f10c74dbc149c2ded790f098a5b73d8d17fada1f7fff0d53709f01244c	["*"]	\N	\N	2026-09-21 11:11:48	2026-09-21 11:11:48
99	App\\Models\\User	46	auth_token	cc5eb9177ce049efe663573fbc638b244548cc1006b8dd6b5de8f6da0e26d64e	["*"]	\N	\N	2026-09-21 11:17:01	2026-09-21 11:17:01
100	App\\Models\\User	46	refresh_token	c3972434c5ccb572e1987647f5a349fa6bd807ba162d03c2f878a2c37ad6e721	["*"]	\N	\N	2026-09-21 11:17:01	2026-09-21 11:17:01
81	App\\Models\\User	38	auth_token	9abeaf662334b6f9c595eb7dd59c426711b1b894dd1966d611c1901fce5987eb	["*"]	2026-09-21 10:38:54	\N	2026-09-21 10:38:46	2026-09-21 10:38:54
101	App\\Models\\User	47	auth_token	fdc8720ce1d36c4c61282fc462e4969b131754d52f7606f3f4ebb5263a327ce8	["*"]	\N	\N	2026-09-21 11:17:08	2026-09-21 11:17:08
102	App\\Models\\User	47	refresh_token	653f6bede9e94abfa29d473b92ce612f2fa318bc304a1291bf6483d73368f254	["*"]	\N	\N	2026-09-21 11:17:08	2026-09-21 11:17:08
79	App\\Models\\User	3	auth_token	5f26446a87bd7f6c6b6b2c89f01a8cd68d7288c21f29673f4e4efbff63fe0262	["*"]	2026-09-21 10:46:23	\N	2026-09-21 10:30:49	2026-09-21 10:46:23
84	App\\Models\\User	6	refresh_token	1fd5a673c3996e66626d96d0af214a106ecc8e044b95b94c40108afc632e6d8f	["*"]	\N	\N	2026-09-21 10:46:23	2026-09-21 10:46:23
83	App\\Models\\User	6	auth_token	3fccda6c97621bcccdf0e70e04f3d96efd843e43fe736c83cc721141435b8de9	["*"]	2026-09-21 10:46:24	\N	2026-09-21 10:46:23	2026-09-21 10:46:24
86	App\\Models\\User	1	refresh_token	8afacd4411f56ae7daf3280a8e2b5525c626b909ffd2fab6d29ecac65362294c	["*"]	\N	\N	2026-09-21 10:46:29	2026-09-21 10:46:29
104	App\\Models\\User	48	refresh_token	25aa0cd5a26468789ef529bf8afe77d713b2bd61722c3548989f3747960f21dd	["*"]	\N	\N	2026-09-21 11:48:11	2026-09-21 11:48:11
103	App\\Models\\User	48	auth_token	f671cba1b1147194819c61c7d3fe2cf2f876d7ae2ce8073dc61e79a7e35302f4	["*"]	2026-09-21 11:48:12	\N	2026-09-21 11:48:11	2026-09-21 11:48:12
106	App\\Models\\User	1	refresh_token	a38b8227196fdb5b4a83901cf52b8464fb571d02390a41e1537cd2207665616b	["*"]	\N	\N	2026-09-21 11:48:34	2026-09-21 11:48:34
105	App\\Models\\User	1	auth_token	4df869ccfb114bfe386c884743e14ad7a820694381dcaafcb789362326cf3f94	["*"]	2026-09-21 12:57:30	\N	2026-09-21 11:48:34	2026-09-21 12:57:30
107	App\\Models\\User	1	auth_token	ca7a62baf214db30e8a6f0ac94afde86346699edec0105bc757c042601e4e3e9	["*"]	\N	\N	2026-09-21 12:06:56	2026-09-21 12:06:56
108	App\\Models\\User	1	refresh_token	c5cfb15c245c64c8e6df91013aa8293ceeefee4800f37a290b10ea1fe5473f36	["*"]	\N	\N	2026-09-21 12:06:56	2026-09-21 12:06:56
109	App\\Models\\User	1	auth_token	521cdfa3259aa927c82795ee8cf689bba4b5ed0deb1ba9594097402df783ab40	["*"]	\N	\N	2026-09-21 12:07:39	2026-09-21 12:07:39
110	App\\Models\\User	1	refresh_token	450bdd992dec8efe82d8338d6c488eaaa5bcfc86c37dbbccef792faa168d2776	["*"]	\N	\N	2026-09-21 12:07:39	2026-09-21 12:07:39
111	App\\Models\\User	1	auth_token	e417d16be410f487a141d586c053fb4b01ff6d921c7d7dc11faab92f4c7297c5	["*"]	\N	\N	2026-09-21 12:08:04	2026-09-21 12:08:04
112	App\\Models\\User	1	refresh_token	c3b1fc320c0c450d3b707087f90d25bc754d4ede8b45284f4593aa19b5378489	["*"]	\N	\N	2026-09-21 12:08:04	2026-09-21 12:08:04
113	App\\Models\\User	37	auth_token	bf7d4d46bf05f5d021623b233ce035eb39dbcbfd27b21480c7830fcbfe19afb6	["*"]	\N	\N	2026-09-21 12:09:15	2026-09-21 12:09:15
114	App\\Models\\User	37	refresh_token	25c9dac1628f91179fc44601c2208d76a14e5013918845afb458ef160b3ab730	["*"]	\N	\N	2026-09-21 12:09:15	2026-09-21 12:09:15
115	App\\Models\\User	37	auth_token	c516faaa4c8047538e2dce2415fe99a18bd3d81ac2edae4b41c12438a093c6cf	["*"]	\N	\N	2026-09-21 12:09:51	2026-09-21 12:09:51
116	App\\Models\\User	37	refresh_token	56a1e502585cf5c514c258d195934e4c2cc5118ee6309a6339a78b1fef5cbdfa	["*"]	\N	\N	2026-09-21 12:09:51	2026-09-21 12:09:51
117	App\\Models\\User	1	auth_token	f0bb6f2d6e35d7b381f499eae5577787818a117645fe89f64e7047e4217ad455	["*"]	\N	\N	2026-09-21 12:10:46	2026-09-21 12:10:46
118	App\\Models\\User	1	refresh_token	6ee0dab0a312099eb4c6187b413a5eec8185205a697b9007329e8ec28630d44c	["*"]	\N	\N	2026-09-21 12:10:46	2026-09-21 12:10:46
119	App\\Models\\User	37	auth_token	104c090521fe791ac1b94f0d49a2aaf18904394670273588c3f3dba4350666fa	["*"]	\N	\N	2026-09-21 12:11:07	2026-09-21 12:11:07
120	App\\Models\\User	37	refresh_token	7a6cfb5d739dd77c9d32f4c243d966d6ac3f46e4ebabf27ccd2f9cea71e2a612	["*"]	\N	\N	2026-09-21 12:11:07	2026-09-21 12:11:07
122	App\\Models\\User	1	refresh_token	c35a0a3a994ce0f67dcc2e190e129a8bc43f4b7d315e1734dd0ff6e80a512e6e	["*"]	\N	\N	2026-09-21 12:11:24	2026-09-21 12:11:24
121	App\\Models\\User	1	auth_token	b929132843da93a34b5ec8ff4a801141267c21c51ef9d7d2c7610ee7711cad1e	["*"]	2026-09-21 12:11:25	\N	2026-09-21 12:11:24	2026-09-21 12:11:25
124	App\\Models\\User	1	refresh_token	54d7b1e3b3a5e85f73a3293951ce925d2b302f74dd017f915cc20173627aa56f	["*"]	\N	\N	2026-09-21 12:11:44	2026-09-21 12:11:44
123	App\\Models\\User	1	auth_token	57ce3f863ac920b93f770c1fd8d5c38deb4d66a56a593ce7b2a2a776957320af	["*"]	2026-09-21 12:11:48	\N	2026-09-21 12:11:44	2026-09-21 12:11:48
126	App\\Models\\User	3	refresh_token	07928f63833cb97e62284efe69bf1519d637d93f731d2f2be33c11d1d8a4e0d3	["*"]	\N	\N	2026-09-21 12:20:02	2026-09-21 12:20:02
128	App\\Models\\User	6	refresh_token	a332fad26c8f31e1ddfee7a7397c65e26a6ecad3a7f61eab343590670b496a21	["*"]	\N	\N	2026-09-21 12:20:02	2026-09-21 12:20:02
135	App\\Models\\User	3	auth_token	a9aa2243f640d8cd41e3fc47cc6858ab7a1801f5dbb89cc6c4104bf54314a70a	["*"]	2026-09-21 12:21:42	\N	2026-09-21 12:21:39	2026-09-21 12:21:42
133	App\\Models\\User	6	auth_token	49db7f75eb00a54cd188d40b86d9b9d97c31f0044a637475fdbcf199686cf924	["*"]	2026-09-21 12:21:43	\N	2026-09-21 12:21:38	2026-09-21 12:21:43
127	App\\Models\\User	6	auth_token	af8d19081a239ae2aefe3b1953bd6256c14db5311a26bd2eda9137b9478e8973	["*"]	2026-09-21 12:20:06	\N	2026-09-21 12:20:02	2026-09-21 12:20:06
125	App\\Models\\User	3	auth_token	7ba2a781c85fb026280ba9c4ab7473221c13ad843c6a45cd576ee30de06d035f	["*"]	2026-09-21 12:20:06	\N	2026-09-21 12:20:02	2026-09-21 12:20:06
130	App\\Models\\User	6	refresh_token	80eaec9121b873a0286ed00c868787d9eb21f034d90d86204d075e9b886d4125	["*"]	\N	\N	2026-09-21 12:21:09	2026-09-21 12:21:09
132	App\\Models\\User	3	refresh_token	4abfbc33947895d7a6df21fa3f0d78ad269c5c5898529247038ccde3140e3f74	["*"]	\N	\N	2026-09-21 12:21:09	2026-09-21 12:21:09
131	App\\Models\\User	3	auth_token	761792bae570b713502ea68702260ba9d997ce561ae0b29f9efcdd3ae7fb0d90	["*"]	2026-09-21 12:21:13	\N	2026-09-21 12:21:09	2026-09-21 12:21:13
129	App\\Models\\User	6	auth_token	996924832f2f8333983322bbf13b7dc2e67ee36bbf3ae5eeee13a517574ca3c6	["*"]	2026-09-21 12:21:13	\N	2026-09-21 12:21:09	2026-09-21 12:21:13
134	App\\Models\\User	6	refresh_token	1c43b5ecfc38cb181205fbf24a65c2e9e0738d6fd1cd846aa94ad61dcc255c9e	["*"]	\N	\N	2026-09-21 12:21:38	2026-09-21 12:21:38
136	App\\Models\\User	3	refresh_token	266aedd7160e9e88086ea8643dd9f6721d46bbf81d58bc55a6a9fcc09d62b9f5	["*"]	\N	\N	2026-09-21 12:21:39	2026-09-21 12:21:39
\.


--
-- Data for Name: placement_drives; Type: TABLE DATA; Schema: public; Owner: campuslink
--

COPY public.placement_drives (id, company_id, job_id, name, drive_type, registration_deadline, start_date, end_date, capacity, status, metadata_json, created_at, updated_at) FROM stdin;
1	1	1	TechCorp Campus Drive 2026	ON_CAMPUS	\N	2026-09-23 22:49:03	2026-09-23 22:49:03	\N	PUBLISHED	{"coordinator_info":"","notes":"","venue":""}	2026-09-13 17:19:03	2026-09-13 17:19:03
2	2	2	Innovate Intern Drive	ON_CAMPUS	\N	2026-09-28 22:49:03	2026-09-28 22:49:03	\N	PUBLISHED	{"coordinator_info":"","notes":"","venue":""}	2026-09-13 17:19:03	2026-09-13 17:19:03
3	3	3	Global Systems Mega Drive	ON_CAMPUS	\N	2026-10-03 22:49:03	2026-10-03 22:49:03	\N	PUBLISHED	{"coordinator_info":"","notes":"","venue":""}	2026-09-13 17:19:03	2026-09-13 17:19:03
\.


--
-- Data for Name: queue_jobs; Type: TABLE DATA; Schema: public; Owner: campuslink
--

COPY public.queue_jobs (id, queue, payload, attempts, reserved_at, available_at, created_at) FROM stdin;
\.


--
-- Data for Name: recruiters; Type: TABLE DATA; Schema: public; Owner: campuslink
--

COPY public.recruiters (id, user_id, company_id, contact_name, contact_email, contact_phone, created_at, updated_at) FROM stdin;
1	3	1	John Doe	recruiter1@comp1.com	\N	2026-09-13 17:19:02	2026-09-13 17:19:02
2	4	2	Jane Smith	recruiter2@comp2.com	\N	2026-09-13 17:19:02	2026-09-13 17:19:02
3	5	3	Robert Brown	recruiter3@comp3.com	\N	2026-09-13 17:19:02	2026-09-13 17:19:02
4	17	4	Rec_audit_23bed8	rec_audit_23bed8@company.com	\N	2026-09-13 19:47:32	2026-09-13 19:47:32
5	20	5	Rec_audit_3c71ef	rec_audit_3c71ef@company.com	\N	2026-09-13 19:48:32	2026-09-13 19:48:32
6	22	6	Rec_audit_b37e6b	rec_audit_b37e6b@company.com	\N	2026-09-13 19:48:40	2026-09-13 19:48:40
7	25	7	Rec_audit_767806	rec_audit_767806@company.com	\N	2026-09-13 19:49:15	2026-09-13 19:49:15
8	28	8	Rec_audit_c38dde	rec_audit_c38dde@company.com	\N	2026-09-13 19:49:36	2026-09-13 19:49:36
9	30	9	Rec_audit_88bccf	rec_audit_88bccf@company.com	\N	2026-09-13 19:49:47	2026-09-13 19:49:47
10	32	12	Rec_audit_15cc91	rec_audit_15cc91@company.com	\N	2026-09-13 20:00:04	2026-09-13 20:00:04
11	34	14	Rec_audit_0cba94	rec_audit_0cba94@company.com	\N	2026-09-13 20:08:32	2026-09-13 20:08:32
12	38	15	Testrecruiter_real	testrecruiter_real@test.com	\N	2026-09-13 20:36:14	2026-09-13 20:36:14
17	48	20	Binayaksabata	binayaksabata@gmail.com	\N	2026-09-21 11:47:55	2026-09-21 11:47:55
\.


--
-- Data for Name: skill_gaps; Type: TABLE DATA; Schema: public; Owner: campuslink
--

COPY public.skill_gaps (id, student_id, job_id, skill_id, gap_severity, current_level, required_level, is_mandatory, analysis_version, recommendation, calculated_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: skills; Type: TABLE DATA; Schema: public; Owner: campuslink
--

COPY public.skills (id, name, category, description, created_at, updated_at) FROM stdin;
1	Python	Technical	\N	2026-09-13 17:19:02	2026-09-13 17:19:02
2	Java	Technical	\N	2026-09-13 17:19:02	2026-09-13 17:19:02
3	React	Technical	\N	2026-09-13 17:19:02	2026-09-13 17:19:02
4	SQL	Technical	\N	2026-09-13 17:19:02	2026-09-13 17:19:02
5	Docker	Technical	\N	2026-09-13 17:19:02	2026-09-13 17:19:02
6	AWS	Technical	\N	2026-09-13 17:19:02	2026-09-13 17:19:02
7	Communication	Soft Skill	\N	2026-09-13 17:19:02	2026-09-13 17:19:02
8	C++	Technical	\N	2026-09-13 17:19:02	2026-09-13 17:19:02
9	Machine Learning	Technical	\N	2026-09-13 17:19:02	2026-09-13 17:19:02
10	KUBERNETES	GENERAL	\N	2026-09-13 17:24:47	2026-09-13 17:24:47
11	GRAPHQL	GENERAL	\N	2026-09-13 18:48:25	2026-09-13 18:48:25
12	PYTHON	GENERAL	\N	2026-09-13 20:18:50	2026-09-13 20:18:50
\.


--
-- Data for Name: student_academic_history; Type: TABLE DATA; Schema: public; Owner: campuslink
--

COPY public.student_academic_history (id, student_id, qualification, institution, specialization, start_year, end_year, score_value, score_type, created_at, updated_at) FROM stdin;
1	1	10th	Delhi Public School	\N	2016	2018	95	PERCENTAGE	2026-09-13 17:19:02	2026-09-20 12:35:10
2	1	12th	Delhi Public School	\N	2018	2020	92	PERCENTAGE	2026-09-13 17:19:02	2026-09-13 17:19:02
\.


--
-- Data for Name: student_assessments; Type: TABLE DATA; Schema: public; Owner: campuslink
--

COPY public.student_assessments (id, student_id, assessment_type, score, max_score, assessment_date, metadata_json, created_at, updated_at) FROM stdin;
1	1	Coding Test	94	100	2026-09-13 22:49:03	\N	2026-09-13 17:19:02	2026-09-13 17:19:02
2	1	Aptitude Test	88	100	2026-09-13 22:49:03	\N	2026-09-13 17:19:02	2026-09-13 17:19:02
3	1	Communication Assessment	86	100	2026-09-13 22:49:03	\N	2026-09-13 17:19:02	2026-09-13 17:19:02
4	1	Mock Interview	90	100	2026-09-13 22:49:03	\N	2026-09-13 17:19:02	2026-09-13 17:19:02
5	2	Coding Test	58	100	2026-09-13 22:49:03	\N	2026-09-13 17:19:02	2026-09-13 17:19:02
6	2	Aptitude Test	62	100	2026-09-13 22:49:03	\N	2026-09-13 17:19:02	2026-09-13 17:19:02
7	3	Coding Test	80	100	2026-09-13 22:49:03	\N	2026-09-13 17:19:02	2026-09-13 17:19:02
8	4	Coding Test	80	100	2026-09-13 22:49:03	\N	2026-09-13 17:19:02	2026-09-13 17:19:02
9	5	Coding Test	80	100	2026-09-13 22:49:03	\N	2026-09-13 17:19:02	2026-09-13 17:19:02
10	6	Coding Test	80	100	2026-09-13 22:49:03	\N	2026-09-13 17:19:02	2026-09-13 17:19:02
11	7	Coding Test	80	100	2026-09-13 22:49:03	\N	2026-09-13 17:19:02	2026-09-13 17:19:02
12	8	Coding Test	80	100	2026-09-13 22:49:03	\N	2026-09-13 17:19:02	2026-09-13 17:19:02
13	9	Coding Test	80	100	2026-09-13 22:49:03	\N	2026-09-13 17:19:02	2026-09-13 17:19:02
14	10	Coding Test	80	100	2026-09-13 22:49:03	\N	2026-09-13 17:19:02	2026-09-13 17:19:02
\.


--
-- Data for Name: student_certifications; Type: TABLE DATA; Schema: public; Owner: campuslink
--

COPY public.student_certifications (id, student_id, name, issuing_org, issue_date, expiry_date, credential_id, created_at, updated_at) FROM stdin;
1	1	AWS Certified Cloud Practitioner	Amazon Web Services	2026-05-16 22:49:02	\N	AWS-CCP-98721	2026-09-13 17:19:02	2026-09-13 17:19:02
2	1	Professional Python Developer	Python Institute	2026-02-25 22:49:02	\N	PCAP-31-03	2026-09-13 17:19:02	2026-09-13 17:19:02
\.


--
-- Data for Name: student_projects; Type: TABLE DATA; Schema: public; Owner: campuslink
--

COPY public.student_projects (id, student_id, title, description, technologies, project_url, created_at, updated_at) FROM stdin;
1	1	E-Commerce Microservices	Architected resilient microservices with FastAPI, Docker, and PostgreSQL with Redis caching.	Python, FastAPI, Docker, PostgreSQL, Redis	https://github.com/alice/ecommerce	2026-09-13 17:19:02	2026-09-13 17:19:02
2	1	Campus Placement Analytics	Full-stack Next.js and Python analytics dashboard tracking corporate drive outcomes.	React, Next.js, Python, TailwindCSS	https://github.com/alice/campuslink	2026-09-13 17:19:02	2026-09-13 17:19:02
3	1	Distributed Task Queue	Lightweight distributed task queue leveraging Python asyncio and message brokers.	Python, asyncio, RabbitMQ	https://github.com/alice/task-queue	2026-09-13 17:19:02	2026-09-13 17:19:02
4	2	Library Management System	Basic CRUD application managing library books and issuing.	Java, Swing, SQLite	\N	2026-09-13 17:19:02	2026-09-13 17:19:02
5	3	Demo Project	A great portfolio project	\N	\N	2026-09-13 17:19:02	2026-09-13 17:19:02
6	4	Demo Project	A great portfolio project	\N	\N	2026-09-13 17:19:02	2026-09-13 17:19:02
7	5	Demo Project	A great portfolio project	\N	\N	2026-09-13 17:19:02	2026-09-13 17:19:02
8	6	Demo Project	A great portfolio project	\N	\N	2026-09-13 17:19:02	2026-09-13 17:19:02
9	7	Demo Project	A great portfolio project	\N	\N	2026-09-13 17:19:02	2026-09-13 17:19:02
10	8	Demo Project	A great portfolio project	\N	\N	2026-09-13 17:19:02	2026-09-13 17:19:02
11	9	Demo Project	A great portfolio project	\N	\N	2026-09-13 17:19:02	2026-09-13 17:19:02
12	10	Demo Project	A great portfolio project	\N	\N	2026-09-13 17:19:02	2026-09-13 17:19:02
\.


--
-- Data for Name: student_scores; Type: TABLE DATA; Schema: public; Owner: campuslink
--

COPY public.student_scores (id, student_id, score_type, score_value, model_version, explanation_data, calculated_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: student_skills; Type: TABLE DATA; Schema: public; Owner: campuslink
--

COPY public.student_skills (id, student_id, skill_id, proficiency_level, months_experience, source, created_at, updated_at) FROM stdin;
1	1	1	ADVANCED	24	VERIFIED	2026-09-13 17:19:03	2026-09-13 17:19:03
2	1	4	ADVANCED	18	ASSESSMENT	2026-09-13 17:19:03	2026-09-13 17:19:03
3	1	3	INTERMEDIATE	12	STUDENT	2026-09-13 17:19:03	2026-09-13 17:19:03
4	1	5	INTERMEDIATE	8	STUDENT	2026-09-13 17:19:03	2026-09-13 17:19:03
5	1	6	BEGINNER	4	STUDENT	2026-09-13 17:19:03	2026-09-13 17:19:03
6	1	7	ADVANCED	12	STUDENT	2026-09-13 17:19:03	2026-09-13 17:19:03
7	2	2	BEGINNER	6	STUDENT	2026-09-13 17:19:03	2026-09-13 17:19:03
8	2	4	BEGINNER	4	STUDENT	2026-09-13 17:19:03	2026-09-13 17:19:03
9	3	1	INTERMEDIATE	0	STUDENT	2026-09-13 17:19:03	2026-09-13 17:19:03
10	4	1	INTERMEDIATE	0	STUDENT	2026-09-13 17:19:03	2026-09-13 17:19:03
11	5	1	INTERMEDIATE	0	STUDENT	2026-09-13 17:19:03	2026-09-13 17:19:03
12	6	1	INTERMEDIATE	0	STUDENT	2026-09-13 17:19:03	2026-09-13 17:19:03
13	7	1	INTERMEDIATE	0	STUDENT	2026-09-13 17:19:03	2026-09-13 17:19:03
14	8	1	INTERMEDIATE	0	STUDENT	2026-09-13 17:19:03	2026-09-13 17:19:03
15	9	1	INTERMEDIATE	0	STUDENT	2026-09-13 17:19:03	2026-09-13 17:19:03
16	10	1	INTERMEDIATE	0	STUDENT	2026-09-13 17:19:03	2026-09-13 17:19:03
17	22	12	ADVANCED	0	STUDENT	2026-09-13 20:18:50	2026-09-13 20:18:50
\.


--
-- Data for Name: students; Type: TABLE DATA; Schema: public; Owner: campuslink
--

COPY public.students (id, user_id, student_identifier, first_name, last_name, branch, graduation_year, cgpa, backlogs_current, backlogs_history, phone, dob, gender, profile_picture_url, resume_url, profile_metadata, created_at, updated_at) FROM stdin;
1	6	STU001	Alice	Johnson	Computer Science	2024	9.20	0	0	999-888-7777	2002-05-14	\N	\N	/static/resumes/student_1_resume.pdf	{"bio": "Updated bio", "github_url": "https://github.com/alice-dev", "linkedin_url": "https://linkedin.com/in/alice-engineer", "portfolio_url": "https://alice.dev"}	2026-09-13 17:19:02	2026-09-13 18:49:13
2	7	STU002	Bob	Smith	Information Technology	2024	7.50	0	0	555-0102	2001-08-22	\N	\N	\N	{"bio": "Frontend enthusiast"}	2026-09-13 17:19:02	2026-09-13 17:19:02
3	8	ROLL2026002	First2	Last2	MECH	2026	7.90	0	0	\N	\N	\N	\N	\N	\N	2026-09-13 17:19:02	2026-09-13 17:19:02
4	9	ROLL2026003	First3	Last3	IT	2026	8.10	0	0	\N	\N	\N	\N	\N	\N	2026-09-13 17:19:02	2026-09-13 17:19:02
5	10	ROLL2026004	First4	Last4	CSE	2026	8.30	0	0	\N	\N	\N	\N	\N	\N	2026-09-13 17:19:02	2026-09-13 17:19:02
6	11	ROLL2026005	First5	Last5	CSE	2026	8.50	0	0	\N	\N	\N	\N	\N	\N	2026-09-13 17:19:02	2026-09-13 17:19:02
7	12	ROLL2026006	First6	Last6	ECE	2026	8.70	0	0	\N	\N	\N	\N	\N	\N	2026-09-13 17:19:02	2026-09-13 17:19:02
8	13	ROLL2026007	First7	Last7	MECH	2026	8.90	0	0	\N	\N	\N	\N	\N	\N	2026-09-13 17:19:02	2026-09-13 17:19:02
9	14	ROLL2026008	First8	Last8	IT	2026	9.10	0	0	\N	\N	\N	\N	\N	\N	2026-09-13 17:19:02	2026-09-13 17:19:02
10	15	ROLL2026009	First9	Last9	CSE	2026	9.30	0	0	\N	\N	\N	\N	\N	\N	2026-09-13 17:19:02	2026-09-13 17:19:02
11	16	STU0016	Stu_audit_ef9b7d	Student	Computer Science	2028	8.00	0	0	\N	\N	\N	\N	\N	\N	2026-09-13 19:47:31	2026-09-13 19:47:31
12	18	STU0018	Stu_audit_99f66b	Student	Computer Science	2028	8.00	0	0	\N	\N	\N	\N	\N	\N	2026-09-13 19:47:51	2026-09-13 19:47:51
13	19	STU0019	Stu_audit_c7f882	Student	Computer Science	2028	8.00	0	0	\N	\N	\N	\N	\N	\N	2026-09-13 19:48:31	2026-09-13 19:48:31
14	21	STU0021	Stu_audit_1f615a	Student	Computer Science	2028	8.00	0	0	\N	\N	\N	\N	\N	\N	2026-09-13 19:48:39	2026-09-13 19:48:39
15	23	STU0023	Stu_audit_e669c3	Student	Computer Science	2028	8.00	0	0	\N	\N	\N	\N	\N	\N	2026-09-13 19:48:48	2026-09-13 19:48:48
16	24	STU0024	Stu_audit_133bd9	Student	Computer Science	2028	8.00	0	0	\N	\N	\N	\N	\N	\N	2026-09-13 19:49:15	2026-09-13 19:49:15
17	26	STU0026	Stu_audit_e499de	Student	Computer Science	2028	8.00	0	0	\N	\N	\N	\N	\N	\N	2026-09-13 19:49:23	2026-09-13 19:49:23
18	27	STU0027	Stu_audit_61cb6d	Student	Computer Science	2028	8.00	0	0	\N	\N	\N	\N	\N	\N	2026-09-13 19:49:35	2026-09-13 19:49:35
19	29	STU0029	Stu_audit_4eb536	Student	Computer Science	2028	8.00	0	0	\N	\N	\N	\N	\N	\N	2026-09-13 19:49:46	2026-09-13 19:49:46
20	31	STU0031	Stu_audit_6c3e2f	Student	Computer Science	2028	8.00	0	0	\N	\N	\N	\N	\N	\N	2026-09-13 20:00:04	2026-09-13 20:00:04
21	33	STU0033	Stu_audit_e8db9a	Student	Computer Science	2028	8.00	0	0	\N	\N	\N	\N	\N	\N	2026-09-13 20:08:32	2026-09-13 20:08:32
22	35	STU0035	Test	Student	Computer Science	2026	8.50	0	0	1234567890	2000-01-01	\N	\N	\N	\N	2026-09-13 20:18:43	2026-09-13 20:18:48
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: campuslink
--

COPY public.users (id, email, password_hash, role, is_active, created_at, updated_at) FROM stdin;
2	po@campuslink.com	$2y$12$C6/lE1FQapzB.ewu42dvd.lV8AKciYVXGm.oI5YHhq8sMDud.7366	PLACEMENT_OFFICER	t	2026-09-13 17:19:02	2026-09-13 17:19:02
4	recruiter2@comp2.com	$2y$12$HxKItM6qK5kPUj6GSj4oe.Jg1LjLffTdcocTNHkJDYfHJyqiURTea	RECRUITER	t	2026-09-13 17:19:02	2026-09-13 17:19:02
5	recruiter3@comp3.com	$2y$12$QrYzJuHUmDBJQVGjV2yTOef4kPfBWJDDF3pghpj2pRCvnZXg3B6Ie	RECRUITER	t	2026-09-13 17:19:02	2026-09-13 17:19:02
7	student2@college.edu	$2y$12$DzUun5lxG1s8PrsaYkHEiOYp/ta6gC250T0tX6/vgktrh5hP8jBk6	STUDENT	t	2026-09-13 17:19:02	2026-09-13 17:19:02
8	student3@college.edu	$2y$12$0MIV/YrTWBx7jWFimGpvUuIiRcMciRHCKPCkVOZO9UvJFjgrV/BVq	STUDENT	t	2026-09-13 17:19:02	2026-09-13 17:19:02
9	student4@college.edu	$2y$12$84PuZAwb3K3bL.wx7gSuMu7cHMgrhr2NhcB4OKPyTGgHSWLTDBJGK	STUDENT	t	2026-09-13 17:19:02	2026-09-13 17:19:02
10	student5@college.edu	$2y$12$BBUvcEydoavvqhYWy9GxS.RAyh/QP6X6Q9/MM9I1XcdsgVyknC.bO	STUDENT	t	2026-09-13 17:19:02	2026-09-13 17:19:02
11	student6@college.edu	$2y$12$FAsfVmovSb2l0NJwrMgmQuMmYKskv00Sjz.QIjr105wri/AkGUGv.	STUDENT	t	2026-09-13 17:19:02	2026-09-13 17:19:02
12	student7@college.edu	$2y$12$uSOe4OpQzTS0CkRxA0PeI.BsYsqtndl4SuiHbbiy4QNjP2rQB6Iii	STUDENT	t	2026-09-13 17:19:02	2026-09-13 17:19:02
13	student8@college.edu	$2y$12$a4T7GNi7BsHEfaD8eo2nGOfZyxcYEEmHnO9XmDoNzeA/hUQUjKKf2	STUDENT	t	2026-09-13 17:19:02	2026-09-13 17:19:02
14	student9@college.edu	$2y$12$OD4lUro5J06x1d1TvbZ62.0w1ZVd1fU/5XzI/FiBC2KV/bN/yPAGu	STUDENT	t	2026-09-13 17:19:02	2026-09-13 17:19:02
15	student10@college.edu	$2y$12$xvLtPJoxrQeg9DAFQmWpYeteCiiRO0HtlqHyRCLV6JSLzBMhodPNy	STUDENT	t	2026-09-13 17:19:02	2026-09-13 17:19:02
1	admin@campuslink.com	$2y$12$k62KlvJMJBDxyD8MIANGbuwxetmj/4bkWounCYS.0euBRB.uf83/q	SUPER_ADMIN	t	2026-09-13 17:19:02	2026-09-21 12:10:32
3	recruiter1@comp1.com	$2y$12$ss4HJBpvXeATiPih2/.8ieFXfeOimGW/ftz4F07W7af9aK3asTpx.	RECRUITER	t	2026-09-13 17:19:02	2026-09-21 12:19:43
6	student1@college.edu	$2y$12$R.42SsrD0ss4soa9lbBX7uOLyibAxBmxfUpJMZluDFg49Uzw7Gekq	STUDENT	t	2026-09-13 17:19:02	2026-09-21 12:19:43
16	stu_audit_ef9b7d@college.edu	$2y$12$8TtHDj70aKlVmJZVyZ5kLuESeh1XiyUmQMfc6cNFF2Wg5j4ikK/5W	STUDENT	t	2026-09-13 19:47:31	2026-09-13 19:47:31
17	rec_audit_23bed8@company.com	$2y$12$U.ON55ZkC8xPoUbAjAGBjOU52G1a6SIse88qho87tca82AnI8RUMW	RECRUITER	t	2026-09-13 19:47:32	2026-09-13 19:47:32
18	stu_audit_99f66b@college.edu	$2y$12$1T9v3jIYGwto4Mvteacxjeka5OIKxLRX3V.4FkEHJPm4pW6pbpAIq	STUDENT	t	2026-09-13 19:47:51	2026-09-13 19:47:51
19	stu_audit_c7f882@college.edu	$2y$12$x0DM4w2wNn8hlD2RUEAHuev1biBP2ugEk5sYyMPpfLb4GcXjARAsG	STUDENT	t	2026-09-13 19:48:31	2026-09-13 19:48:31
20	rec_audit_3c71ef@company.com	$2y$12$onEcWjXwv7EFVHB.IkrmV.ALk5Y5GInJv4jk4NSVJOKJgXhhCiOKi	RECRUITER	t	2026-09-13 19:48:32	2026-09-13 19:48:32
21	stu_audit_1f615a@college.edu	$2y$12$VHki6R8sQCeT8SrSeFAYPeGycq4Bgqdb2VEv1PggS/TducD/pTvf2	STUDENT	t	2026-09-13 19:48:39	2026-09-13 19:48:39
22	rec_audit_b37e6b@company.com	$2y$12$vfhiXbb/glN92f9LCNLjHuNxsImPrBC5j1ED0mpRQtEn8H4EkIjjS	RECRUITER	t	2026-09-13 19:48:40	2026-09-13 19:48:40
23	stu_audit_e669c3@college.edu	$2y$12$P9ckRD94csebF0lAAwOreugr84CI6yebL8kkAMulEHvobnYF3XFUO	STUDENT	t	2026-09-13 19:48:48	2026-09-13 19:48:48
24	stu_audit_133bd9@college.edu	$2y$12$/LyIHk/r1FYMyAsqChLqoetbN2dSxigXaRK6pKYRJ06NDL1HjWScS	STUDENT	t	2026-09-13 19:49:15	2026-09-13 19:49:15
25	rec_audit_767806@company.com	$2y$12$W7aA09rIjP7.czh7wxhsDOW1ycvqtOkRh2951.O3qh7kLw3D5K4ii	RECRUITER	t	2026-09-13 19:49:15	2026-09-13 19:49:15
26	stu_audit_e499de@college.edu	$2y$12$CeJHmVTbWDvk3cyReu/edeg5OClNMHYiEEo4Ayu6/jqJmx/3pDl9q	STUDENT	t	2026-09-13 19:49:23	2026-09-13 19:49:23
27	stu_audit_61cb6d@college.edu	$2y$12$5GIohK9Sk1LGpr1v5DrPheA4WiAt.pcACWn5EcU4sebnIGGmFmDr2	STUDENT	t	2026-09-13 19:49:35	2026-09-13 19:49:35
28	rec_audit_c38dde@company.com	$2y$12$KpCsJ1NtaU6qb8TZUiwP5OKmm4pM3OpOAE.RpG1d3Qn7Ly/BpF302	RECRUITER	t	2026-09-13 19:49:36	2026-09-13 19:49:36
29	stu_audit_4eb536@college.edu	$2y$12$CYePPmeSYGTc4rLtGm13BuPhCU9xKeIi2BI68ChI7tbVSQ5nairHe	STUDENT	t	2026-09-13 19:49:46	2026-09-13 20:00:01
30	rec_audit_88bccf@company.com	$2y$12$Gmw6UIBZzlhbnAdAFuBc7Od5S/Us4zgENKyowU1fpoIB2lHGVNpp6	RECRUITER	t	2026-09-13 19:49:47	2026-09-13 19:49:47
31	stu_audit_6c3e2f@college.edu	$2y$12$oU3OkP7dIcCWbVqUFcay8uUTf105A0ZJyT8sckBDpAZFrRAZ8BsXq	STUDENT	t	2026-09-13 20:00:04	2026-09-13 20:08:29
32	rec_audit_15cc91@company.com	$2y$12$rhFYPnkMTJ6618vJSbDVguotm6/Qs/5N04eHq1c50QfNXcqMwoJIu	RECRUITER	t	2026-09-13 20:00:04	2026-09-13 20:00:04
33	stu_audit_e8db9a@college.edu	$2y$12$l4mmVjM8Cz7e8slsLqJ4keXziW/tbA1SFzQhPpwwvGK6Onm/ePxpO	STUDENT	t	2026-09-13 20:08:32	2026-09-13 20:08:32
34	rec_audit_0cba94@company.com	$2y$12$BcjyomSLpfiJJYAO1actDePRFrbt7VtX3pC3UiqPnoN/.by1FDds2	RECRUITER	t	2026-09-13 20:08:32	2026-09-13 20:08:32
35	teststudent99@test.com	$2y$12$rFdFLyMDFY1wy062GMYBCO5WHeDG1OqkS9zz7/MtxQ43v998q902q	STUDENT	t	2026-09-13 20:18:43	2026-09-13 20:18:43
36	testrecruiter99@test.com	$2y$12$Rab3wnvUBR7QIEI.YID/Uu0cywap0rq.p.f2IsCotvEi61gdPhV.m	RECRUITER	t	2026-09-13 20:26:54	2026-09-13 20:26:54
37	testadmin99@test.com	$2y$12$u0G8lYD6DnV/d1wG6pZ.geMaCMbKj1cEPWfeRqIJyJSocV.jitosC	SUPER_ADMIN	t	2026-09-13 20:26:54	2026-09-13 20:26:54
38	testrecruiter_real@test.com	$2y$12$BYF.SFQ.Ye9CqFqeadT9nubsI26T4tEJQ8d43ZcvWaUp0kie5Cd8u	RECRUITER	t	2026-09-13 20:36:14	2026-09-13 20:36:14
48	binayaksabata@gmail.com	$2y$12$iDBv0aUCFR1HFdicMYfZE.bYAcT3bSHORbompwFOOiRL7awaZkhae	RECRUITER	t	2026-09-21 11:47:55	2026-09-21 11:47:55
\.


--
-- Name: applications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: campuslink
--

SELECT pg_catalog.setval('public.applications_id_seq', 7, true);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: campuslink
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 1, false);


--
-- Name: companies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: campuslink
--

SELECT pg_catalog.setval('public.companies_id_seq', 20, true);


--
-- Name: drive_candidates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: campuslink
--

SELECT pg_catalog.setval('public.drive_candidates_id_seq', 6, true);


--
-- Name: drive_schedules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: campuslink
--

SELECT pg_catalog.setval('public.drive_schedules_id_seq', 1, false);


--
-- Name: failed_jobs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: campuslink
--

SELECT pg_catalog.setval('public.failed_jobs_id_seq', 1, false);


--
-- Name: interviews_id_seq; Type: SEQUENCE SET; Schema: public; Owner: campuslink
--

SELECT pg_catalog.setval('public.interviews_id_seq', 1, false);


--
-- Name: job_requirements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: campuslink
--

SELECT pg_catalog.setval('public.job_requirements_id_seq', 12, true);


--
-- Name: jobs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: campuslink
--

SELECT pg_catalog.setval('public.jobs_id_seq', 32, true);


--
-- Name: matching_scores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: campuslink
--

SELECT pg_catalog.setval('public.matching_scores_id_seq', 1, false);


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: campuslink
--

SELECT pg_catalog.setval('public.migrations_id_seq', 27, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: campuslink
--

SELECT pg_catalog.setval('public.notifications_id_seq', 1, false);


--
-- Name: offer_documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: campuslink
--

SELECT pg_catalog.setval('public.offer_documents_id_seq', 1, false);


--
-- Name: offers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: campuslink
--

SELECT pg_catalog.setval('public.offers_id_seq', 1, false);


--
-- Name: personal_access_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: campuslink
--

SELECT pg_catalog.setval('public.personal_access_tokens_id_seq', 136, true);


--
-- Name: placement_drives_id_seq; Type: SEQUENCE SET; Schema: public; Owner: campuslink
--

SELECT pg_catalog.setval('public.placement_drives_id_seq', 3, true);


--
-- Name: queue_jobs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: campuslink
--

SELECT pg_catalog.setval('public.queue_jobs_id_seq', 1, false);


--
-- Name: recruiters_id_seq; Type: SEQUENCE SET; Schema: public; Owner: campuslink
--

SELECT pg_catalog.setval('public.recruiters_id_seq', 17, true);


--
-- Name: skill_gaps_id_seq; Type: SEQUENCE SET; Schema: public; Owner: campuslink
--

SELECT pg_catalog.setval('public.skill_gaps_id_seq', 1, false);


--
-- Name: skills_id_seq; Type: SEQUENCE SET; Schema: public; Owner: campuslink
--

SELECT pg_catalog.setval('public.skills_id_seq', 12, true);


--
-- Name: student_academic_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: campuslink
--

SELECT pg_catalog.setval('public.student_academic_history_id_seq', 2, true);


--
-- Name: student_assessments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: campuslink
--

SELECT pg_catalog.setval('public.student_assessments_id_seq', 1, false);


--
-- Name: student_certifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: campuslink
--

SELECT pg_catalog.setval('public.student_certifications_id_seq', 2, true);


--
-- Name: student_projects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: campuslink
--

SELECT pg_catalog.setval('public.student_projects_id_seq', 12, true);


--
-- Name: student_scores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: campuslink
--

SELECT pg_catalog.setval('public.student_scores_id_seq', 1, false);


--
-- Name: student_skills_id_seq; Type: SEQUENCE SET; Schema: public; Owner: campuslink
--

SELECT pg_catalog.setval('public.student_skills_id_seq', 17, true);


--
-- Name: students_id_seq; Type: SEQUENCE SET; Schema: public; Owner: campuslink
--

SELECT pg_catalog.setval('public.students_id_seq', 27, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: campuslink
--

SELECT pg_catalog.setval('public.users_id_seq', 48, true);


--
-- Name: applications applications_pkey; Type: CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (id);


--
-- Name: applications applications_student_id_job_id_unique; Type: CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_student_id_job_id_unique UNIQUE (student_id, job_id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: cache_locks cache_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.cache_locks
    ADD CONSTRAINT cache_locks_pkey PRIMARY KEY (key);


--
-- Name: cache cache_pkey; Type: CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.cache
    ADD CONSTRAINT cache_pkey PRIMARY KEY (key);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: drive_candidates drive_candidates_drive_id_student_id_unique; Type: CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.drive_candidates
    ADD CONSTRAINT drive_candidates_drive_id_student_id_unique UNIQUE (drive_id, student_id);


--
-- Name: drive_candidates drive_candidates_pkey; Type: CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.drive_candidates
    ADD CONSTRAINT drive_candidates_pkey PRIMARY KEY (id);


--
-- Name: drive_schedules drive_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.drive_schedules
    ADD CONSTRAINT drive_schedules_pkey PRIMARY KEY (id);


--
-- Name: failed_jobs failed_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.failed_jobs
    ADD CONSTRAINT failed_jobs_pkey PRIMARY KEY (id);


--
-- Name: failed_jobs failed_jobs_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.failed_jobs
    ADD CONSTRAINT failed_jobs_uuid_unique UNIQUE (uuid);


--
-- Name: interviews interviews_pkey; Type: CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.interviews
    ADD CONSTRAINT interviews_pkey PRIMARY KEY (id);


--
-- Name: job_batches job_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.job_batches
    ADD CONSTRAINT job_batches_pkey PRIMARY KEY (id);


--
-- Name: job_requirements job_requirements_job_id_skill_id_unique; Type: CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.job_requirements
    ADD CONSTRAINT job_requirements_job_id_skill_id_unique UNIQUE (job_id, skill_id);


--
-- Name: job_requirements job_requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.job_requirements
    ADD CONSTRAINT job_requirements_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: matching_scores matching_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.matching_scores
    ADD CONSTRAINT matching_scores_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: offer_documents offer_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.offer_documents
    ADD CONSTRAINT offer_documents_pkey PRIMARY KEY (id);


--
-- Name: offers offers_pkey; Type: CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.offers
    ADD CONSTRAINT offers_pkey PRIMARY KEY (id);


--
-- Name: personal_access_tokens personal_access_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.personal_access_tokens
    ADD CONSTRAINT personal_access_tokens_pkey PRIMARY KEY (id);


--
-- Name: personal_access_tokens personal_access_tokens_token_unique; Type: CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.personal_access_tokens
    ADD CONSTRAINT personal_access_tokens_token_unique UNIQUE (token);


--
-- Name: placement_drives placement_drives_pkey; Type: CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.placement_drives
    ADD CONSTRAINT placement_drives_pkey PRIMARY KEY (id);


--
-- Name: queue_jobs queue_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.queue_jobs
    ADD CONSTRAINT queue_jobs_pkey PRIMARY KEY (id);


--
-- Name: recruiters recruiters_pkey; Type: CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.recruiters
    ADD CONSTRAINT recruiters_pkey PRIMARY KEY (id);


--
-- Name: recruiters recruiters_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.recruiters
    ADD CONSTRAINT recruiters_user_id_unique UNIQUE (user_id);


--
-- Name: skill_gaps skill_gaps_pkey; Type: CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.skill_gaps
    ADD CONSTRAINT skill_gaps_pkey PRIMARY KEY (id);


--
-- Name: skill_gaps skill_gaps_student_id_job_id_skill_id_unique; Type: CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.skill_gaps
    ADD CONSTRAINT skill_gaps_student_id_job_id_skill_id_unique UNIQUE (student_id, job_id, skill_id);


--
-- Name: skills skills_name_unique; Type: CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_name_unique UNIQUE (name);


--
-- Name: skills skills_pkey; Type: CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_pkey PRIMARY KEY (id);


--
-- Name: student_academic_history student_academic_history_pkey; Type: CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.student_academic_history
    ADD CONSTRAINT student_academic_history_pkey PRIMARY KEY (id);


--
-- Name: student_assessments student_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.student_assessments
    ADD CONSTRAINT student_assessments_pkey PRIMARY KEY (id);


--
-- Name: student_certifications student_certifications_pkey; Type: CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.student_certifications
    ADD CONSTRAINT student_certifications_pkey PRIMARY KEY (id);


--
-- Name: student_projects student_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.student_projects
    ADD CONSTRAINT student_projects_pkey PRIMARY KEY (id);


--
-- Name: student_scores student_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.student_scores
    ADD CONSTRAINT student_scores_pkey PRIMARY KEY (id);


--
-- Name: student_skills student_skills_pkey; Type: CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.student_skills
    ADD CONSTRAINT student_skills_pkey PRIMARY KEY (id);


--
-- Name: student_skills student_skills_student_id_skill_id_unique; Type: CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.student_skills
    ADD CONSTRAINT student_skills_student_id_skill_id_unique UNIQUE (student_id, skill_id);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


--
-- Name: students students_student_identifier_unique; Type: CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_student_identifier_unique UNIQUE (student_identifier);


--
-- Name: students students_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_user_id_unique UNIQUE (user_id);


--
-- Name: drive_schedules uq_drive_schedule; Type: CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.drive_schedules
    ADD CONSTRAINT uq_drive_schedule UNIQUE (drive_id, student_id, start_time);


--
-- Name: matching_scores uq_match_score; Type: CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.matching_scores
    ADD CONSTRAINT uq_match_score UNIQUE (student_id, job_id, drive_id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: applications_status_index; Type: INDEX; Schema: public; Owner: campuslink
--

CREATE INDEX applications_status_index ON public.applications USING btree (status);


--
-- Name: cache_expiration_index; Type: INDEX; Schema: public; Owner: campuslink
--

CREATE INDEX cache_expiration_index ON public.cache USING btree (expiration);


--
-- Name: cache_locks_expiration_index; Type: INDEX; Schema: public; Owner: campuslink
--

CREATE INDEX cache_locks_expiration_index ON public.cache_locks USING btree (expiration);


--
-- Name: companies_name_index; Type: INDEX; Schema: public; Owner: campuslink
--

CREATE INDEX companies_name_index ON public.companies USING btree (name);


--
-- Name: failed_jobs_connection_queue_failed_at_index; Type: INDEX; Schema: public; Owner: campuslink
--

CREATE INDEX failed_jobs_connection_queue_failed_at_index ON public.failed_jobs USING btree (connection, queue, failed_at);


--
-- Name: jobs_status_index; Type: INDEX; Schema: public; Owner: campuslink
--

CREATE INDEX jobs_status_index ON public.jobs USING btree (status);


--
-- Name: jobs_title_index; Type: INDEX; Schema: public; Owner: campuslink
--

CREATE INDEX jobs_title_index ON public.jobs USING btree (title);


--
-- Name: offers_status_index; Type: INDEX; Schema: public; Owner: campuslink
--

CREATE INDEX offers_status_index ON public.offers USING btree (status);


--
-- Name: personal_access_tokens_expires_at_index; Type: INDEX; Schema: public; Owner: campuslink
--

CREATE INDEX personal_access_tokens_expires_at_index ON public.personal_access_tokens USING btree (expires_at);


--
-- Name: personal_access_tokens_tokenable_type_tokenable_id_index; Type: INDEX; Schema: public; Owner: campuslink
--

CREATE INDEX personal_access_tokens_tokenable_type_tokenable_id_index ON public.personal_access_tokens USING btree (tokenable_type, tokenable_id);


--
-- Name: placement_drives_name_index; Type: INDEX; Schema: public; Owner: campuslink
--

CREATE INDEX placement_drives_name_index ON public.placement_drives USING btree (name);


--
-- Name: queue_jobs_queue_index; Type: INDEX; Schema: public; Owner: campuslink
--

CREATE INDEX queue_jobs_queue_index ON public.queue_jobs USING btree (queue);


--
-- Name: skills_category_index; Type: INDEX; Schema: public; Owner: campuslink
--

CREATE INDEX skills_category_index ON public.skills USING btree (category);


--
-- Name: applications applications_drive_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_drive_id_foreign FOREIGN KEY (drive_id) REFERENCES public.placement_drives(id) ON DELETE SET NULL;


--
-- Name: applications applications_job_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_job_id_foreign FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: applications applications_student_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_student_id_foreign FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: drive_candidates drive_candidates_drive_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.drive_candidates
    ADD CONSTRAINT drive_candidates_drive_id_foreign FOREIGN KEY (drive_id) REFERENCES public.placement_drives(id) ON DELETE CASCADE;


--
-- Name: drive_candidates drive_candidates_student_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.drive_candidates
    ADD CONSTRAINT drive_candidates_student_id_foreign FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: drive_schedules drive_schedules_drive_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.drive_schedules
    ADD CONSTRAINT drive_schedules_drive_id_foreign FOREIGN KEY (drive_id) REFERENCES public.placement_drives(id) ON DELETE CASCADE;


--
-- Name: drive_schedules drive_schedules_student_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.drive_schedules
    ADD CONSTRAINT drive_schedules_student_id_foreign FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: interviews interviews_application_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.interviews
    ADD CONSTRAINT interviews_application_id_foreign FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE;


--
-- Name: job_requirements job_requirements_job_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.job_requirements
    ADD CONSTRAINT job_requirements_job_id_foreign FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: job_requirements job_requirements_skill_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.job_requirements
    ADD CONSTRAINT job_requirements_skill_id_foreign FOREIGN KEY (skill_id) REFERENCES public.skills(id) ON DELETE CASCADE;


--
-- Name: jobs jobs_company_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_company_id_foreign FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: jobs jobs_recruiter_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_recruiter_id_foreign FOREIGN KEY (recruiter_id) REFERENCES public.recruiters(id) ON DELETE SET NULL;


--
-- Name: matching_scores matching_scores_drive_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.matching_scores
    ADD CONSTRAINT matching_scores_drive_id_foreign FOREIGN KEY (drive_id) REFERENCES public.placement_drives(id) ON DELETE SET NULL;


--
-- Name: matching_scores matching_scores_job_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.matching_scores
    ADD CONSTRAINT matching_scores_job_id_foreign FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: matching_scores matching_scores_student_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.matching_scores
    ADD CONSTRAINT matching_scores_student_id_foreign FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: offer_documents offer_documents_offer_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.offer_documents
    ADD CONSTRAINT offer_documents_offer_id_foreign FOREIGN KEY (offer_id) REFERENCES public.offers(id) ON DELETE CASCADE;


--
-- Name: offers offers_application_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.offers
    ADD CONSTRAINT offers_application_id_foreign FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE SET NULL;


--
-- Name: offers offers_job_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.offers
    ADD CONSTRAINT offers_job_id_foreign FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: offers offers_recruiter_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.offers
    ADD CONSTRAINT offers_recruiter_id_foreign FOREIGN KEY (recruiter_id) REFERENCES public.recruiters(id) ON DELETE CASCADE;


--
-- Name: offers offers_student_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.offers
    ADD CONSTRAINT offers_student_id_foreign FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: placement_drives placement_drives_company_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.placement_drives
    ADD CONSTRAINT placement_drives_company_id_foreign FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: placement_drives placement_drives_job_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.placement_drives
    ADD CONSTRAINT placement_drives_job_id_foreign FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: recruiters recruiters_company_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.recruiters
    ADD CONSTRAINT recruiters_company_id_foreign FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: recruiters recruiters_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.recruiters
    ADD CONSTRAINT recruiters_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: skill_gaps skill_gaps_job_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.skill_gaps
    ADD CONSTRAINT skill_gaps_job_id_foreign FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: skill_gaps skill_gaps_skill_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.skill_gaps
    ADD CONSTRAINT skill_gaps_skill_id_foreign FOREIGN KEY (skill_id) REFERENCES public.skills(id) ON DELETE CASCADE;


--
-- Name: skill_gaps skill_gaps_student_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.skill_gaps
    ADD CONSTRAINT skill_gaps_student_id_foreign FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_academic_history student_academic_history_student_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.student_academic_history
    ADD CONSTRAINT student_academic_history_student_id_foreign FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_assessments student_assessments_student_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.student_assessments
    ADD CONSTRAINT student_assessments_student_id_foreign FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_certifications student_certifications_student_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.student_certifications
    ADD CONSTRAINT student_certifications_student_id_foreign FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_projects student_projects_student_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.student_projects
    ADD CONSTRAINT student_projects_student_id_foreign FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_scores student_scores_student_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.student_scores
    ADD CONSTRAINT student_scores_student_id_foreign FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_skills student_skills_skill_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.student_skills
    ADD CONSTRAINT student_skills_skill_id_foreign FOREIGN KEY (skill_id) REFERENCES public.skills(id) ON DELETE CASCADE;


--
-- Name: student_skills student_skills_student_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.student_skills
    ADD CONSTRAINT student_skills_student_id_foreign FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: students students_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: campuslink
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict sRt3hMW93NY40DSVty4OkGipgf08qkUt54fH9VRYgCmLeBsIG0EbRxJTRpACUEU

