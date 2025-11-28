---
puppeteer:
  format: "A4"
  margin:
    top: "2cm"
    right: "1.5cm"
    bottom: "2cm"
    left: "1.5cm"
  printBackground: true
  displayHeaderFooter: true
  headerTemplate: '<div style="font-size: 9px; margin-left: 1cm; color: #666;">Orange-Fleshed Sweet Potato (OFSP) Value Chain Digital Platform Technical Proposal</div>'
  footerTemplate: '<div style="font-size: 9px; margin: 0 auto; color: #666;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>'
---

<style>
@media print {
  /* Base font settings */
  body {
    font-family: 'Calibri', 'Arial', sans-serif;
    font-size: 11pt;
    line-height: 1.6;
    color: #333;
  }
  
  /* Headings */
  h1 {
    font-family: 'Calibri', 'Arial', sans-serif;
    font-size: 22pt;
    font-weight: bold;
    color: #1a1a1a;
    page-break-before: always;
    margin-top: 0;
    margin-bottom: 12pt;
  }
  
  h2 {
    font-family: 'Calibri', 'Arial', sans-serif;
    font-size: 18pt;
    font-weight: bold;
    color: #2c3e50;
    page-break-after: avoid;
    margin-top: 18pt;
    margin-bottom: 10pt;
  }
  
  h3 {
    font-family: 'Calibri', 'Arial', sans-serif;
    font-size: 14pt;
    font-weight: bold;
    color: #34495e;
    margin-top: 14pt;
    margin-bottom: 8pt;
  }
  
  h4 {
    font-family: 'Calibri', 'Arial', sans-serif;
    font-size: 12pt;
    font-weight: bold;
    color: #555;
    margin-top: 12pt;
    margin-bottom: 6pt;
  }
  
  /* Paragraphs */
  p {
    font-size: 11pt;
    margin-bottom: 8pt;
    text-align: justify;
  }
  
  /* Lists */
  ul, ol {
    font-size: 11pt;
    margin-bottom: 8pt;
  }
  
  li {
    margin-bottom: 4pt;
  }
  
  /* Tables */
  table {
    font-size: 10pt;
    width: 100%;
    border-collapse: collapse;
    page-break-inside: avoid;
    margin-bottom: 12pt;
  }
  
  th {
    font-weight: bold;
    background-color: #f0f0f0;
    padding: 6pt;
  }
  
  td {
    padding: 6pt;
  }
  
  /* Code blocks */
  code {
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 9pt;
    background-color: #f4f4f4;
    padding: 2px 4px;
  }
  
  pre {
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 9pt;
    background-color: #f8f8f8;
    padding: 10pt;
    border: 1px solid #ddd;
    page-break-inside: avoid;
    overflow-x: auto;
  }
  
  /* Block quotes */
  blockquote {
    font-size: 10pt;
    font-style: italic;
    border-left: 3px solid #ccc;
    padding-left: 10pt;
    margin-left: 0;
    page-break-inside: avoid;
  }
  
  /* Prevent page breaks */
  h1, h2, h3, h4, h5, h6 {
    page-break-after: avoid;
  }
  
  pre, blockquote, table, figure {
    page-break-inside: avoid;
  }
  
  /* Mermaid diagrams */
  .mermaid {
    page-break-inside: avoid;
    margin: 12pt 0;
    max-height: 700px;
    max-width: 100%;
    object-fit: contain;
  }
  
  /* Images and figures */
  img {
    max-width: 100%;
    max-height: 650px;
    object-fit: contain;
    page-break-inside: avoid;
    page-break-before: auto;
    page-break-after: auto;
    display: block;
    margin: 12pt auto;
  }
  
  figure {
    page-break-inside: avoid;
    margin: 12pt 0;
    text-align: center;
  }
  
  figure img {
    max-height: 600px;
    width: auto;
    height: auto;
  }
  
  /* SVG images (including Mermaid) */
  svg {
    max-width: 100%;
    max-height: 650px;
    page-break-inside: avoid;
  }
  
  /* Diagrams container */
  div[style*="transform: scale"] {
    page-break-inside: avoid;
    page-break-before: auto;
    page-break-after: auto;
  }
  
  /* Strong/Bold text */
  strong, b {
    font-weight: bold;
    color: #1a1a1a;
  }
  
  /* Emphasis/Italic text */
  em, i {
    font-style: italic;
  }
}
</style>


# **Technical Proposal Part 3: Implementation & Delivery**

## 7. Implementation Methodology & Work Plan

### 7.1 Development Approach

We will follow an **Agile methodology** with rapid iterations:

| Phase | Approach | Duration |
|-------|----------|----------|
| **Phase 1: Requirements & Design** | Stakeholder workshops, system design, UI/UX mockups | 5 days |
| **Phase 2: Development** | Sprint-based development, daily standups, continuous testing | 10 days |
| **Phase 3: Testing & Refinement** | Beta testing with Concern staff, bug fixes, user feedback | 2 days |
| **Phase 4: Training & Documentation** | User training, admin training, documentation | 2 days |
| **Phase 5: Deployment & Handover** | Production deployment, final testing, handover | 2 days |
| **Phase 6: Post-Deployment Support** | Bug fixes, monitoring, optimization | 4 days (overlap) |

### 7.2 Detailed Work Plan

**Phase 1: Requirements Analysis & Design (Days 1-5)**

| Day | Activities | Deliverables |
|-----|------------|--------------|
| **Day 1** | • Kickoff meeting with Concern & County Officers<br/>• Stakeholder interviews<br/>• Review existing systems/processes<br/>• Confirm user roles and access levels | Meeting minutes, Stakeholder interview notes |
| **Day 2** | • Define functional requirements<br/>• Map user workflows<br/>• Define data structures<br/>• API endpoint specifications | Functional requirements document (draft) |
| **Day 3** | • System architecture design<br/>• Database schema design<br/>• Security & compliance review<br/>• Technology stack finalization | System architecture document, Database ERD |
| **Day 4** | • UI/UX wireframes<br/>• Mobile & web mockups<br/>• USSD flow design<br/>• Dashboard layout designs | UI/UX mockups, Wireframes |
| **Day 5** | • Review & validation with Concern<br/>• Finalize requirements<br/>• Project plan confirmation | **Deliverable 1: System Requirement & Design Document** |

**Phase 2: Platform Development (Days 6-15)**

| Day | Activities | Deliverables |
|-----|------------|--------------|
| **Days 6-7** | • Setup development environment<br/>• Database creation & migration<br/>• Backend API skeleton<br/>• Authentication module | Development environment ready |
| **Days 8-9** | • Marketplace module (listings, orders)<br/>• Aggregation center module (stock tracking)<br/>• User management module | Core backend APIs |
| **Days 10-11** | • Frontend development (web & mobile PWA)<br/>• Farmer interface<br/>• Buyer interface | Frontend interfaces (70% complete) |
| **Days 12-13** | • USSD gateway integration<br/>• SMS notification system<br/>• Dashboard for County Officers & Concern Staff<br/>• Peer monitoring module | USSD & dashboards functional |
| **Days 14-15** | • Integration testing<br/>• Bug fixes<br/>• Performance optimization<br/>• Security hardening | **Deliverable 2: Prototype Platform for Review** |

**Phase 3: Testing & Validation (Days 16-17)**

| Day | Activities | Deliverables |
|-----|------------|--------------|
| **Day 16** | • Deploy beta version to staging server<br/>• Concern staff testing (functionality)<br/>• Security testing<br/>• Performance testing | Beta version deployed |
| **Day 17** | • Collect feedback<br/>• Bug fixes<br/>• UI/UX refinements<br/>• Final testing | **Deliverable 3: Testing Report with Refinements** |

**Phase 4: Training & Capacity Building (Days 18-19)**

| Day | Activities | Deliverables |
|-----|------------|--------------|
| **Day 18** | • County Officer training (dashboard, user management, reports)<br/>• Aggregation center manager training (stock tracking)<br/>• Concern staff training (admin functions) | Training sessions completed |
| **Day 19** | • Farmer training (marketplace, USSD, orders)<br/>• Buyer training (browsing, ordering, ratings)<br/>• Create video tutorials | **Deliverable 4: Training Manuals & Materials** |

**Phase 5: Deployment & Handover (Days 20-21)**

| Day | Activities | Deliverables |
|-----|------------|--------------|
| **Day 20** | • Deploy to production server<br/>• DNS configuration<br/>• SSL certificate setup<br/>• Final smoke testing | Production platform live |
| **Day 21** | • System handover to County ICT officers<br/>• Provide admin credentials<br/>• Knowledge transfer session<br/>• Sustainability plan review | **Deliverable 5: Final Platform & Technical Documentation** |

**Phase 6: Post-Deployment Support (Days 22-25)**

| Day | Activities | Deliverables |
|-----|------------|--------------|
| **Days 22-25** | • Monitor system performance<br/>• Address any critical bugs<br/>• User support<br/>• Performance optimization | Stable production system |

### 7.3 Gantt Chart

```mermaid
gantt
    title OFSP Platform Development Timeline (25 Days)
    dateFormat  YYYY-MM-DD
    section Phase 1: Design
    Requirements Analysis           :a1, 2025-11-26, 2d
    System Architecture            :a2, after a1, 2d
    UI/UX Design                   :a3, after a2, 1d
    section Phase 2: Development
    Backend Development            :b1, after a3, 4d
    Frontend Development           :b2, after b1, 3d
    USSD & Dashboards             :b3, after b2, 2d
    Integration & Testing         :b4, after b3, 1d
    section Phase 3: Testing
    Beta Testing                  :c1, after b4, 2d
    section Phase 4: Training
    Training & Documentation      :d1, after c1, 2d
    section Phase 5: Deployment
    Production Deployment         :e1, after d1, 2d
    section Phase 6: Support
    Post-Deployment Support       :f1, after e1, 4d
```

---


## 9. Deliverables

### 9.1 Deliverable Schedule

| Deliverable | Description | Due Day | Format |
|-------------|-------------|---------|--------|
| **D1: System Requirement & Design Document** | Complete technical specifications, architecture, UI/UX mockups, database schema | Day 5 | PDF + Editable (Word/Figma) |
| **D2: Prototype Platform** | Functional beta version with core features for testing | Day 15 | Web URL + Mobile App Link |
| **D3: Testing Report** | Comprehensive testing results, bug fixes, refinements | Day 17 | PDF Report |
| **D4: Training Package** | User manuals, admin guides, video tutorials, training materials | Day 19 | PDF + Videos + Presentation |
| **D5: Final Platform** | Production-ready platform hosted on secure server | Day 21 | Live URL + Admin Access |
| **D6: Technical Documentation** | Source code, API docs, deployment guide, database docs, admin credentials | Day 21 | PDF + Code Repository |
| **D7: Sustainability Plan** | Long-term ownership, hosting, maintenance, handover plan | Day 21 | PDF Document |
| **D8: Post-Deployment Report** | Performance metrics, user feedback, recommendations | Day 25 | PDF Report |

### 9.2 Deliverable Details

**D1: System Requirement & Design Document**
- Executive summary
- Functional requirements (detailed)
- System architecture diagrams
- Database ERD and schema
- API endpoint specifications
- UI/UX wireframes and mockups
- User role and permission matrix
- Security and compliance specifications
- Technology stack justification

**D2: Prototype Platform**
- Beta version on staging server
- Core marketplace functionality
- Aggregation center tracking
- Peer monitoring features
- Admin dashboards
- USSD gateway (demo mode)
- Test data and user accounts

**D3: Testing Report**
- Functionality testing results
- Usability testing findings
- Security audit results
- Performance benchmarks
- Browser/device compatibility matrix
- Bug log and resolution status
- User feedback summary
- Refinements implemented

**D4: Training Package**
- **Farmer User Manual** (English, Swahili, Kikamba)
  - Registration process
  - Posting produce
  - Managing orders
  - Using USSD
  - Viewing peer leaderboards
- **Buyer User Manual**
  - Registration and browsing
  - Placing orders
  - Tracking deliveries
  - Rating farmers
- **County Officer Manual**
  - Dashboard navigation
  - Generating reports
  - User management
  - Monitoring aggregation centers
- **Aggregation Center Manager Manual**
  - Stock in/out procedures
  - Quality grading
  - Receipt generation
  - Inventory management
- **System Administrator Guide**
  - User management
  - Platform configuration
  - Troubleshooting
  - Backup and recovery
- **Video Tutorials** (5-10 minutes each)
  - Platform overview
  - Farmer registration and usage
  - Admin dashboard walkthrough
  - Aggregation center operations
- **Training Presentation Slides**

**D5: Final Platform**
- Production deployment on secure hosting
- Custom domain configured (e.g., ofsp.machakos.go.ke)
- SSL certificate installed
- All features functional
- Performance optimized
- Security hardened
- Data migration (if applicable)

**D6: Technical Documentation**
- **Source Code**
  - GitHub/GitLab repository
  - README with setup instructions
  - Code comments and documentation
- **API Documentation**
  - Endpoint descriptions
  - Request/response examples
  - Authentication guide
- **Database Documentation**
  - Schema diagram
  - Table descriptions
  - Relationship documentation
- **Deployment Guide**
  - Server requirements
  - Installation steps
  - Configuration instructions
  - Troubleshooting guide
- **Admin Credentials**
  - Super admin accounts
  - County officer accounts
  - Database access
  - Server access

**D7: Sustainability Plan**
- **Ownership Structure**
  - Machakos County Government ownership
  - Roles and responsibilities
  - Governance framework
- **Hosting Arrangement**
  - Current hosting details
  - Migration to county servers (if applicable)
  - Backup and disaster recovery
- **Maintenance Plan**
  - Regular maintenance schedule
  - Update procedures
  - Security patches
- **Capacity Building**
  - County ICT officer training
  - Knowledge transfer sessions
  - Ongoing support mechanisms
- **Financial Sustainability**
  - Hosting cost estimates
  - Maintenance budget
  - Revenue generation opportunities (optional)
- **Expansion Roadmap**
  - Scaling to other counties
  - Additional features
  - Integration with county systems

**D8: Post-Deployment Report**
- Platform performance metrics (uptime, response time, etc.)
- User adoption statistics
- Feedback from farmers, buyers, officers
- Issues encountered and resolved
- Recommendations for optimization
- Next steps and continuous improvement suggestions

---

## 10. Sustainability Approach

### 10.1 Ownership Model

```mermaid
flowchart TD
    Concern[Concern Worldwide<br/>Project Phase] --> Handover[Platform Handover]
    
    Handover --> County[Machakos County Government<br/>Primary Owner]
    
    County --> ICT[County ICT Department<br/>System Administration]
    County --> Agri[County Agriculture Department<br/>Content & User Management]
    
    ICT --> Hosting[Hosting & Infrastructure]
    ICT --> Maintenance[System Maintenance]
    ICT --> Security[Security & Backups]
    
    Agri --> Users[User Support]
    Agri --> Content[Content Updates]
    Agri --> Training[Farmer Training]
    
    Hosting --> Support1[Initial Support:<br/>Our Team - 3 months]
    Maintenance --> Support1
    
    Support1 --> LongTerm[Long-term Support:<br/>County Team with On-call Help]
    
    style Concern fill:#e1f5ff
    style County fill:#90EE90
    style LongTerm fill:#fff4e1
```

### 10.2 Sustainability Strategies

| Strategy | Implementation |
|----------|----------------|
| **Local Ownership** | County Government as primary owner with full admin access and source code |
| **Capacity Building** | Comprehensive training for County ICT & Agriculture officers |
| **Knowledge Transfer** | Documentation, video tutorials, hands-on sessions, shadowing |
| **Low Maintenance** | Modern tech stack, automated backups, minimal manual intervention |
| **Cost Efficiency** | Cloud hosting (~$50-100/month), auto-scaling to control costs |
| **Community Engagement** | Farmer champions, buyer ambassadors, extension officer network |
| **Continuous Improvement** | Feedback loops, quarterly reviews, feature prioritization |
| **Integration Ready** | API for integration with county systems (e.g., CIDP, e-Citizen) |
| **Scalability** | Architecture supports expansion to other counties/crops |
| **Revenue Model (Optional)** | Small transaction fees, premium features for large buyers |

### 10.3 Transition Plan

**3-Month Transition Period:**

| Month | Activities | Responsibility |
|-------|------------|----------------|
| **Month 1** | • Platform live with our team actively monitoring<br/>• Daily check-ins with County ICT team<br/>• Address all critical issues immediately<br/>• Collect user feedback | Our Team + County Team |
| **Month 2** | • County ICT team takes primary responsibility<br/>• Our team provides on-call support<br/>• Weekly review meetings<br/>• Resolve non-critical issues | County Team (Lead) + Our Team (Support) |
| **Month 3** | • County team fully independent<br/>• Our team available for consultation only<br/>• Final performance review<br/>• Handover closeout | County Team (Independent) + Our Team (Advisory) |

**Post-Transition:**
- Quarterly check-in calls (Year 1)
- On-call support for critical issues (SLA: 24-hour response)
- Annual platform health check
- Optional paid support contract for enhancements

---

## 11. Risk Management Plan

### 11.1 Identified Risks & Mitigation

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| **Timeline Delay** | Medium | High | Agile sprints, buffer time, parallel workstreams, experienced team |
| **Farmer Adoption** | Medium | High | USSD for feature phones, local language support, extensive training, farmer champions |
| **Internet Connectivity** | High | Medium | Offline mode, SMS fallback, USSD for feature phones, low-bandwidth optimization |
| **Data Security Breach** | Low | High | Encryption, regular audits, access controls, backup systems, compliance with KDPA |
| **Server Downtime** | Low | High | Redundant infrastructure, automated backups, 24/7 monitoring, disaster recovery plan |
| **Budget Overrun** | Low | Medium | Fixed-price contract, clear scope, change management process |
| **Staff Turnover (County)** | Medium | Medium | Comprehensive documentation, video tutorials, multiple trained officers |
| **Scope Creep** | Medium | Medium | Clear requirements, change request process, stakeholder sign-offs |
| **User Data Privacy Concerns** | Low | High | KDPA compliance, clear privacy policy, opt-in consent, data minimization |
| **Integration Challenges** | Medium | Low | Standard APIs, well-documented interfaces, fallback options |

### 11.2 Contingency Plans

| Scenario | Contingency |
|----------|-------------|
| **Developer unavailable** | Backup developer from team, comprehensive code documentation |
| **Hosting server issues** | Backup hosting provider pre-configured, automated failover |
| **USSD gateway failure** | SMS fallback, web/app remain functional, alternative USSD provider |
| **Low farmer adoption** | Incentive program, community mobilization, door-to-door sensitization |
| **Security incident** | Incident response plan, data breach notification protocol, forensics team |
| **Budget constraints** | Phased rollout, prioritize core features, defer nice-to-have features |
| **County handover challenges** | Extended support period, additional training sessions, remote support |

---

